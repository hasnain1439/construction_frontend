"use client";

import { useEffect, useState, type RefObject } from "react";

export interface ScrollEdges {
  /** The content is wider than the box (it scrolls sideways). */
  overflow: boolean;
  /** There is hidden content before the start edge (scrolled away from the start). */
  start: boolean;
  /** There is hidden content past the end edge. */
  end: boolean;
}

const NONE: ScrollEdges = { overflow: false, start: false, end: false };

/**
 * Which sides of a sideways-scrolling box hide content. `scrollLeft` is negative in right-to-left
 * pages (Urdu), so only its size counts; a pixel of slack absorbs sub-pixel rounding.
 */
export function scrollEdges(scrollLeft: number, scrollWidth: number, clientWidth: number): ScrollEdges {
  const max = scrollWidth - clientWidth;
  if (max <= 1) return NONE;
  const pos = Math.abs(scrollLeft);
  return { overflow: true, start: pos > 1, end: pos < max - 1 };
}

/**
 * Tracks `scrollEdges` of the element `select` finds inside `frame` (or of `frame` itself) on scroll
 * and resize. `deps` re-attach the listeners when the scrolling element is re-rendered.
 */
export function useScrollEdges(frame: RefObject<HTMLElement | null>, select?: string, deps: unknown[] = []): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);
  useEffect(() => {
    const root = frame.current;
    const box = select ? root?.querySelector<HTMLElement>(select) : root;
    // No scrolling box (loading, empty or cards): the last edges are kept; they only style that box.
    if (!box) return;
    const update = () => {
      const next = scrollEdges(box.scrollLeft, box.scrollWidth, box.clientWidth);
      setEdges((current) => (current.overflow === next.overflow && current.start === next.start && current.end === next.end ? current : next));
    };
    update();
    box.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(box);
    if (box.firstElementChild) observer?.observe(box.firstElementChild);
    return () => {
      box.removeEventListener("scroll", update);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass what re-renders the box
  }, [frame, select, ...deps]);
  return edges;
}
