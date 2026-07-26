// app/api/vellumup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

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
// Everything from here down is the Supabase implementation - the default
// wiring, matching vellumup/articles.sql. It is the only part of this file
// tied to a specific database.
//
// Using something else (plain Postgres, MySQL, Prisma, Drizzle, Mongo, ...)?
// Replace the two functions below with your own upsert/update calls and drop
// the createClient import above. Nothing else in this file changes: the
// signature check, the event switch and the response handling are all
// database-agnostic.
//
// Why the service-role key: vellumup/articles.sql turns on Row Level
// Security with a public read-only policy, so the anon key cannot write.
// The service-role key bypasses RLS and must never reach the browser - it is
// safe here because route handlers only ever run on the server. If you are
// not on Supabase you almost certainly do not need an equivalent: your own
// connection string already carries write access.

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Upsert on (slug, language_code) - the unique key in articles.sql. Each
// translation is its own row sharing the base article's slug, so a
// translated article never overwrites the original.
async function upsertArticle(data: VellumUpArticleData): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;

  const { error } = await supabase.from('articles').upsert(
    {
      vellumup_id: data.id,
      slug: data.slug,
      language_code: data.language_code ?? 'en',
      language_name: data.language_name ?? null,
      title: data.title,
      content: data.content,
      status: data.status ?? 'published',
      cover_image: data.cover_image ?? null,
      cover_image_url: data.cover_image_url ?? null,
      meta_description: data.meta_description ?? null,
      focus_keyword: data.focus_keyword ?? null,
      secondary_keywords: data.secondary_keywords ?? [],
      key_takeaways: data.key_takeaways ?? [],
      internal_link_slugs: data.internal_link_slugs ?? [],
      word_count: data.word_count ?? null,
      reading_time_minutes: data.reading_time_minutes ?? null,
      website_url: data.website_url ?? null,
      website_domain: data.website_domain ?? null,
      og_title: data.og_title ?? null,
      og_description: data.og_description ?? null,
      og_type: data.og_type ?? null,
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? new Date().toISOString(),
    },
    { onConflict: 'slug,language_code' },
  );
  if (error) throw error;
}

// Unpublish rather than delete, so anything already built or cached on your
// site can fall back to a draft state instead of 404ing.
async function markArticleDraft(slug: string, languageCode = 'en'): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;

  const { error } = await supabase
    .from('articles')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .eq('language_code', languageCode);
  if (error) throw error;
}

function isStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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

  if (!isStorageConfigured()) {
    // Still a 200: the endpoint itself is reachable and the signature was
    // valid, so there is nothing for VellumUp to retry or flag. The article
    // just was not stored.
    console.warn(
      '[vellumup] Article received but not stored - no database configured.\n' +
        'Fill NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your\n' +
        'environment, or replace upsertArticle()/markArticleDraft() in this\n' +
        'file with calls to whatever database you use.',
    );
    return NextResponse.json({ received: true, stored: false });
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
    // 500 tells you something is genuinely wrong (bad credentials, missing
    // table, schema mismatch) instead of silently dropping articles.
    console.error('[vellumup] failed to store article:', err);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, stored: true });
}
