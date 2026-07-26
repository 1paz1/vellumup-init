// app/api/vellumup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

const VELLUMUP_WEBHOOK_SECRET = process.env.VELLUMUP_WEBHOOK_SECRET!;
const MAX_SKEW_SECONDS = 300; // reject requests older than 5 minutes (replay protection)

type VellumUpEvent =
  | 'article.published'
  | 'article.updated'
  | 'article.unpublished'
  | 'article.translated'
  | 'webhook.test';

// Only id/slug/title/content/status are guaranteed on every delivery -
// everything else may be missing (the "Test connection" payload is a
// strict subset of real article payloads).
interface VellumUpArticleData {
  id: string;
  slug: string;
  status: 'published' | 'draft';
  title: string;
  content: string; // Markdown, or HTML if you chose HTML format for this endpoint
  cover_image?: string | null;
  cover_image_url?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  secondary_keywords?: string[];
  // _heading is set only on element [0], as a section heading for the whole
  // list - it is not a per-item field, every other element omits it.
  key_takeaways?: { takeaway: string; _heading?: string }[];
  internal_link_slugs?: string[];
  word_count?: number;
  reading_time_minutes?: number;
  website_url?: string | null;
  website_domain?: string;
  og_title?: string;
  og_description?: string;
  og_type?: string;
  created_at?: string;
  updated_at?: string;
  language_code?: string;   // present only on article.translated
  language_name?: string;   // present only on article.translated
}

interface VellumUpPayload {
  id: string;
  created_at: string;
  data: VellumUpArticleData;
}

function verifySignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;

  const parts: Record<string, string> = {};
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key && value) parts[key] = value;
  }

  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_SKEW_SECONDS) return false;

  const expected = createHmac('sha256', VELLUMUP_WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false; // guard before timingSafeEqual

  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // MUST read the raw body before any JSON parsing

  if (!verifySignature(rawBody, req.headers.get('x-vellumup-signature'))) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const event = req.headers.get('x-vellumup-event') as VellumUpEvent | null;
  const payload = JSON.parse(rawBody) as VellumUpPayload;

  if (event === 'webhook.test') {
    // Fired by the "Test connection" button in the VellumUp dashboard.
    // Acknowledge only - don't touch your database with this example data.
    return NextResponse.json({ received: true });
  }

  // TODO: map payload.data into your own database. The Prisma / Supabase docs
  // panel below has copy-paste-ready upsertArticle() and markArticleDraft()
  // functions matching this exact event switch - paste one in above and
  // uncomment this block.
  //
  // switch (event) {
  //   case 'article.published':
  //   case 'article.updated':
  //   case 'article.translated':
  //     await upsertArticle(payload.data);
  //     break;
  //   case 'article.unpublished':
  //     await markArticleDraft(payload.data.slug, payload.data.language_code);
  //     break;
  // }

  return NextResponse.json({ received: true });
}
