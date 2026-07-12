import { useEffect, useRef, RefObject } from "react";

/**
 * 平滑滚动 Hook (Lenis 风格)
 * 拦截滚轮事件,用 requestAnimationFrame 做平滑插值
 */
export function useSmoothScroll(ref: RefObject<HTMLElement | null>, speed = 0.08) {
  const targetY = useRef(0);
  const currentY = useRef(0);
  const rafId = useRef(0);
  const isScrolling = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const animate = () => {
      currentY.current = lerp(currentY.current, targetY.current, speed);

      // 接近目标时停止动画
      if (Math.abs(currentY.current - targetY.current) < 0.5) {
        currentY.current = targetY.current;
        isScrolling.current = false;
      }

      el.scrollTop = currentY.current;

      if (isScrolling.current) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    // 事件落在内层可滚动区域(如弹窗正文)时不得拦截,交还原生滚动;
    // 标记了 data-scroll-isolate 的遮罩层内,滚轮也不应穿透滚动本页面
    const hasInnerScroller = (start: EventTarget | null): boolean => {
      let node = start instanceof Element ? start : null;
      while (node && node !== el) {
        if (node instanceof HTMLElement) {
          if (node.dataset.scrollIsolate !== undefined) return true;
          if (node.scrollHeight > node.clientHeight) {
            const oy = getComputedStyle(node).overflowY;
            if (oy === "auto" || oy === "scroll") return true;
          }
        }
        node = node.parentElement;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (hasInnerScroller(e.target)) return;

      e.preventDefault();

      const maxScroll = el.scrollHeight - el.clientHeight;
      targetY.current = Math.max(0, Math.min(maxScroll, targetY.current + e.deltaY));

      if (!isScrolling.current) {
        isScrolling.current = true;
        currentY.current = el.scrollTop;
        rafId.current = requestAnimationFrame(animate);
      }
    };

    // 同步初始位置
    targetY.current = el.scrollTop;
    currentY.current = el.scrollTop;

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(rafId.current);
    };
  }, [ref, speed]);
}
