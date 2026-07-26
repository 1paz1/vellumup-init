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
  // Slugs of other articles the AI linked to inline - use these to show
  // genuinely related articles on your site instead of just the newest ones.
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

// ── Storing articles ─────────────────────────────────────────────────────
//
// These two functions are the only part left to write. Fill them in with
// calls to whatever database or CMS you already use - Postgres, MySQL,
// Prisma, Drizzle, Mongo, a headless CMS API, anything.
//
// vellumup/articles.sql (written alongside this file) has a ready-made
// Postgres schema if you want a starting point. Adapt it freely - the only
// thing that matters is that an article is uniquely identified by its slug
// AND language_code together, since each translation arrives as its own
// delivery sharing the base article's slug.

async function upsertArticle(data: VellumUpArticleData): Promise<void> {
  // Insert the article, or update it if a row with this slug +
  // language_code already exists. Roughly:
  //
  //   await db.article.upsert({
  //     where:  { slug_languageCode: { slug: data.slug, languageCode: data.language_code ?? 'en' } },
  //     create: { ...mapFields(data) },
  //     update: { ...mapFields(data) },
  //   });
  console.log('[vellumup] TODO: store article', data.slug, data.language_code ?? 'en');
}

async function markArticleDraft(slug: string, languageCode = 'en'): Promise<void> {
  // Unpublish rather than delete, so anything already built or cached on
  // your site can fall back to a draft state instead of 404ing. Roughly:
  //
  //   await db.article.update({
  //     where: { slug_languageCode: { slug, languageCode } },
  //     data:  { status: 'draft' },
  //   });
  console.log('[vellumup] TODO: unpublish article', slug, languageCode);
}

// ── Signature verification ───────────────────────────────────────────────

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

  try {
    switch (event) {
      case 'article.published':
      case 'article.updated':
      case 'article.translated':
        await upsertArticle(payload.data);
        break;
      case 'article.unpublished':
        await markArticleDraft(payload.data.slug, payload.data.language_code);
        break;
      default:
        console.warn('[vellumup] unhandled event type:', event);
    }
  } catch (err) {
    // 500 tells you something is genuinely wrong instead of silently
    // dropping articles.
    console.error('[vellumup] failed to store article:', err);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
