// components/PillTableOfContents.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { BLOG_ACCENT } from '@/lib/blog-theme';

interface TocItem {
  id: string;
  label: string;
}

// Shared scrollspy: one IntersectionObserver, one activeId, one scrollTo -
// both the pill and sidebar variants below call this instead of duplicating
// the observer wiring.
function useTocScrollspy(items: TocItem[]) {
  const [activeId, setActiveId] = useState('');
  // True from a tap/click until the user provides real scroll input again
  // (wheel/touch/arrow-key). While true, the observer below is ignored -
  // this pins activeId to whatever was tapped instead of racing the
  // observer against the smooth-scroll animation via timers, which is
  // unreliable (animation duration varies with distance).
  const pinnedRef = useRef(false);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (pinnedRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveId(entry.target.id); break; }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // Real user scroll input - the only thing allowed to unpin. Deliberately
    // not 'scroll', since that also fires for the programmatic smooth-scroll
    // triggered by the tap/click itself.
    function unpin() { pinnedRef.current = false; }
    function handleKeydown(e: KeyboardEvent) {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) unpin();
    }
    window.addEventListener('wheel', unpin, { passive: true });
    window.addEventListener('touchstart', unpin, { passive: true });
    window.addEventListener('keydown', handleKeydown);

    return () => {
      observer.disconnect();
      window.removeEventListener('wheel', unpin);
      window.removeEventListener('touchstart', unpin);
      window.removeEventListener('keydown', handleKeydown);
    };
    // items is usually a literal array built inline by the caller, so a
    // reference-based dep would re-run this on every render - stringify it
    // instead so the effect only re-runs when the TOC structure actually changes.
  }, [JSON.stringify(items)]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    // Pin activeId to the tapped/clicked item - only real user scroll input
    // (wheel/touch/arrow-key, wired up above) can unpin it.
    pinnedRef.current = true;
  }

  return { activeId, scrollTo };
}

interface PillTableOfContentsProps {
  items: TocItem[];
  /** 'pill' = bottom pill + dropdown (small screens). 'sidebar' = plain
   *  sticky vertical list (lg and up). Render BOTH variants unconditionally
   *  in your own three-column responsive grid - see this file's top comment. */
  variant?: 'pill' | 'sidebar';
  title?: string;
  accentColor?: string;
  /** Sidebar variant only: link back to the blog index shown above the
   *  "On this page" label - set to null to hide it. Ignored by the pill
   *  variant (small screens usually already have their own back link
   *  elsewhere on the page, e.g. above the article title). */
  backHref?: string | null;
  backLabel?: string;
}

export function PillTableOfContents({
  items,
  variant = 'pill',
  title = 'On this page',
  accentColor = BLOG_ACCENT,
  backHref = '/blog',
  backLabel = 'Back to blog',
}: PillTableOfContentsProps) {
  const { activeId, scrollTo } = useTocScrollspy(items);

  if (items.length === 0) return null;

  if (variant === 'sidebar') {
    // lg and up: plain sticky sidebar list - same scrollspy/active-item
    // state as the pill, no dropdown since there's room to show every item
    // at once. Needs the page around it to lay this out beside the article
    // text (see this file's top comment); on its own it's just
    // `position: sticky`, no reserved width.
    return (
      <nav
        aria-label={title}
        className="hidden lg:flex flex-col gap-1.5 sticky top-24 max-h-[calc(100vh-7.5rem)] overflow-y-auto"
      >
        {backHref && (
          <a
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-700 transition-colors mb-4 px-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </a>
        )}
        <p className="text-[13px] font-bold text-slate-500 px-2 mb-1">{title}</p>
        {items.map(item => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              aria-current={isActive ? 'location' : undefined}
              className={`w-full text-start py-1.5 px-2.5 rounded-lg text-[13px] transition-all flex items-center gap-2 ${
                isActive ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/60'
              }`}
            >
              {isActive && <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />}
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  // Below lg: bottom pill + expandable dropdown.
  return <PillVariant items={items} title={title} accentColor={accentColor} activeId={activeId} scrollTo={scrollTo} />;
}

// Split out of PillTableOfContents so the pill's own `open` dropdown state
// doesn't need to exist on the sidebar variant's render path at all.
function PillVariant({
  items, title, accentColor, activeId, scrollTo,
}: {
  items: TocItem[]; title: string; accentColor: string;
  activeId: string; scrollTo: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeItem = items.find(item => item.id === activeId);

  function handleSelect(id: string) {
    scrollTo(id);
    setOpen(false);
  }

  return (
    <div className="lg:hidden sticky bottom-6 z-40 flex justify-center px-5">
      <div className="w-full max-w-72">
        {open && (
          <nav
            id="toc-pill-menu"
            aria-label={title}
            className="absolute bottom-full inset-x-0 mb-2 rounded-2xl border border-slate-200 bg-white/97 backdrop-blur-xl shadow-lg p-4 max-h-[50vh] overflow-y-auto"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              {title}
            </p>
            <div className="flex flex-col gap-1">
              {items.map(item => {
                const isActive = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? 'location' : undefined}
                    style={isActive ? { color: accentColor, backgroundColor: `${accentColor}1a` } : undefined}
                    className={`text-start text-[13px] leading-snug rounded-lg py-1.5 px-2.5 transition-all ${
                      isActive ? 'font-semibold' : 'font-normal text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <button
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls="toc-pill-menu"
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-full border border-slate-200 bg-white/96 backdrop-blur-xl shadow-lg cursor-pointer"
        >
          <span className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-start" style={{ color: accentColor }}>
            {activeItem?.label ?? title}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
