// SYNC-RULE: mirrored from lucidseo lib/catalog-items/full-article-page/wired-example.ts (WIRED_BLOG_KEY_TAKEAWAYS).
// Edit both in the same commit - see templates/SYNC.md for the extraction recipe.
// Known deltas here: this header, and em-dashes replaced with plain hyphens.
// components/BlogKeyTakeaways.tsx
//
// Same component as the standalone "Key Takeaways Boxed" catalog item, named
// to match VellumUp's own production blog page (BlogKeyTakeaways in
// app/[locale]/blog/[slug]/page.tsx) since this is the exact piece it wires
// into the full article page above.
//
// SYNC RULE (see top of this file): mirrored 1:1 by
// app/preview/nextjs-integration/components/BlogKeyTakeaways.tsx.

interface BlogKeyTakeawaysProps {
  title?: string;
  /** Each string supports simple **bold** markdown */
  items: string[];
  accentColor?: string;
}

// Minimal **bold** → <strong> parser - intentionally does not support other
// markdown syntax, since a call-out box only ever needs light emphasis.
function renderTakeaway(text: string): (string | React.ReactNode)[] {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      : part
  );
}

export function BlogKeyTakeaways({
  title = 'Key Takeaways',
  items,
  accentColor = '#4A68E5',
}: BlogKeyTakeawaysProps) {
  if (!items.length) return null;

  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{ backgroundColor: `${accentColor}0d`, borderInlineStart: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: accentColor }} aria-hidden="true">
          <path d="M13 2L4.09 12.11a1 1 0 0 0 .76 1.65h4.32l-1.15 6.68a.5.5 0 0 0 .86.44L19.91 9.77a1 1 0 0 0-.76-1.65h-4.32l1.15-6.68a.5.5 0 0 0-.86-.44z" fill="currentColor" />
        </svg>
        <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
          {title}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-700 leading-snug">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} aria-hidden="true" />
            <span>{renderTakeaway(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
