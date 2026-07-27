// components/BlogKeyTakeaways.tsx

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
      className="rounded-xl px-6 py-6"
      style={{ backgroundColor: `${accentColor}08` }}
      aria-label="Key takeaways"
    >
      <div className="flex items-center gap-2 mb-5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: accentColor }} aria-hidden="true">
          <path d="M13 2L4.09 12.11a1 1 0 0 0 .76 1.65h4.32l-1.15 6.68a.5.5 0 0 0 .86.44L19.91 9.77a1 1 0 0 0-.76-1.65h-4.32l1.15-6.68a.5.5 0 0 0-.86-.44z" fill="currentColor" />
        </svg>
        <span className="text-[13.5px] font-semibold tracking-wide text-slate-900">
          {title}
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-[14.5px] text-slate-600 leading-relaxed">
            <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }} aria-hidden="true" />
            <span>{renderTakeaway(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
