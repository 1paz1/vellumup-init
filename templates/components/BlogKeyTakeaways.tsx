// components/BlogKeyTakeaways.tsx

import { BLOG_ACCENT, DEFAULT_KEY_TAKEAWAYS_VARIANT, type KeyTakeawaysVariant } from '@/lib/blog-theme';

interface BlogKeyTakeawaysProps {
  title?: string;
  /** Each string supports simple **bold** markdown */
  items: string[];
  accentColor?: string;
  /** Box look - see KeyTakeawaysVariant in lib/blog-theme.ts for what each one does. */
  variant?: KeyTakeawaysVariant;
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

function LightbulbIcon({ accentColor }: { accentColor: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: accentColor }} aria-hidden="true">
      <path d="M13 2L4.09 12.11a1 1 0 0 0 .76 1.65h4.32l-1.15 6.68a.5.5 0 0 0 .86.44L19.91 9.77a1 1 0 0 0-.76-1.65h-4.32l1.15-6.68a.5.5 0 0 0-.86-.44z" fill="currentColor" />
    </svg>
  );
}

function Heading({ title, accentColor, icon = true }: { title: string; accentColor: string; icon?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {icon && <LightbulbIcon accentColor={accentColor} />}
      <span className="text-[13.5px] font-semibold tracking-wide text-slate-900">{title}</span>
    </div>
  );
}

export function BlogKeyTakeaways({
  title = 'Key Takeaways',
  items,
  accentColor = BLOG_ACCENT,
  variant = DEFAULT_KEY_TAKEAWAYS_VARIANT,
}: BlogKeyTakeawaysProps) {
  if (!items.length) return null;

  // Soft: tinted box, numbered accent badges instead of plain dots - reads
  // like a curated list of points rather than a generic bullet list.
  if (variant === 'soft') {
    return (
      <div className="rounded-xl px-6 py-6" style={{ backgroundColor: `${accentColor}08` }} aria-label="Key takeaways">
        <Heading title={title} accentColor={accentColor} />
        <ul className="flex flex-col gap-3.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[14.5px] text-slate-600 leading-relaxed">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>{renderTakeaway(item)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Bordered: left accent rail instead of a border around the whole box -
  // cleaner, more editorial, no fill color.
  if (variant === 'bordered') {
    return (
      <div className="flex gap-4 py-1" aria-label="Key takeaways">
        <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }} aria-hidden="true" />
        <div className="flex-1 min-w-0 py-1">
          <Heading title={title} accentColor={accentColor} />
          <ul className="flex flex-col gap-3.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[14.5px] text-slate-600 leading-relaxed">
                <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }} aria-hidden="true" />
                <span>{renderTakeaway(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Numbered: no box, same heading as the other variants, understated
  // accent-colored digits as the marker, rows separated by thin divider
  // lines - an editorial, spacious list rather than a callout.
  if (variant === 'numbered') {
    return (
      <div aria-label="Key takeaways">
        <Heading title={title} accentColor={accentColor} icon={false} />
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li
              key={i}
              className={`flex items-start gap-4 py-3 text-[14.5px] text-slate-600 leading-relaxed ${
                i > 0 ? 'border-t border-slate-100' : ''
              }`}
            >
              <span className="text-[13px] font-bold shrink-0 pt-0.5" style={{ color: accentColor }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{renderTakeaway(item)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Plain: no box, no dots - each point gets a checkmark, reading as a
  // simple confirmed-facts list rather than a callout.
  return (
    <div aria-label="Key takeaways">
      <Heading title={title} accentColor={accentColor} />
      <ul className="flex flex-col gap-3.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14.5px] text-slate-600 leading-relaxed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.5"
              className="shrink-0 mt-0.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{renderTakeaway(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
