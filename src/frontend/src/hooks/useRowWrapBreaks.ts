import { useEffect, useState, useRef } from 'react';

/**
 * Hook that detects where visual row breaks occur in a wrapped flex container
 * Returns indices where between-row connectors should be rendered
 */
export function useRowWrapBreaks(itemCount: number, containerRef: React.RefObject<HTMLElement | null>) {
  const [rowBreakIndices, setRowBreakIndices] = useState<number[]>([]);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current || itemCount === 0) {
      setRowBreakIndices([]);
      return;
    }

    const detectRowBreaks = () => {
      const breaks: number[] = [];
      let previousTop: number | null = null;

      itemRefs.current.forEach((element, index) => {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const currentTop = rect.top;

        if (previousTop !== null && Math.abs(currentTop - previousTop) > 10) {
          // Row break detected - add the index of the last item in the previous row
          breaks.push(index - 1);
        }

        previousTop = currentTop;
      });

      setRowBreakIndices(breaks);
    };

    // Initial detection
    detectRowBreaks();

    // Re-detect on window resize
    const resizeObserver = new ResizeObserver(detectRowBreaks);
    resizeObserver.observe(containerRef.current);

    window.addEventListener('resize', detectRowBreaks);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', detectRowBreaks);
    };
  }, [itemCount, containerRef]);

  return { rowBreakIndices, itemRefs };
}
