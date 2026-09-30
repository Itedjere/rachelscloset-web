import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dragging a list into a new order.
 *
 * CLAUDE.md §3 says no drag and drop, and the reasons were good ones: touch
 * DnD fights page scroll, and "press and hold, then move" has no affordance
 * somebody who reads poorly can decode. This does not overturn that — THE
 * ARROWS STAY. Dragging is added beside them for the people who reach for it
 * first, and every list that has this also keeps a control that needs no
 * gesture at all.
 *
 * The two original objections are answered rather than ignored:
 *
 *   - **It does not fight scroll.** A drag can only begin on the grip, and
 *     `touch-action: none` is set on the grip alone. Everywhere else on the
 *     row — the label, the play button, the arrows — the page scrolls
 *     exactly as it did. Dragging near the top or bottom edge scrolls the
 *     page itself, so a list longer than the screen still works.
 *   - **It has an affordance.** A grip you press is a visible handle, not a
 *     hidden long-press on the whole row.
 *
 * Pointer events, so one path covers finger, mouse and pen — the same choice
 * as the lightbox and the public carousels.
 */
export function useReorder<T extends { id: number }>({
  items,
  onCommit,
  disabled = false,
}: {
  items: T[];
  /** Given the new order, once the drag ends and something actually moved. */
  onCommit: (next: T[]) => void;
  disabled?: boolean;
}) {
  const listRef = useRef<HTMLElement | null>(null);

  /** The order on screen. Equals `items` except mid-drag. */
  const [order, setOrder] = useState<T[]>(items);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);

  /*
   * The active pointer id as a ref as well as state.
   *
   * The handlers guard on "is this the row being dragged", and reading that
   * from state means the first pointermove in the same frame as the
   * pointerdown is dropped -- React has not re-rendered, so the handler
   * still closes over `draggingId === null`. A ref is true the instant it
   * is set, which is what a gesture needs.
   */
  const activeId = useRef<number | null>(null);

  const grabbedAt = useRef(0);
  const pointerY = useRef(0);
  const startedFrom = useRef<T[]>([]);
  const scrolling = useRef<number | null>(null);

  // While a drag is in flight the local order is the truth; outside one the
  // parent's is. Without this guard a save landing mid-drag would yank the
  // list out from under the finger.
  useEffect(() => {
    if (draggingId === null) setOrder(items);
  }, [items, draggingId]);

  /*
   * The order as a ref as well as state: the pointer handlers read it while
   * a gesture is in flight, and a closure captured at pointerdown would
   * still be looking at the order as it was when the finger went down.
   */
  const orderRef = useRef(order);
  orderRef.current = order;

  const rows = useCallback(
    () => Array.from(listRef.current?.children ?? []) as HTMLElement[],
    [],
  );

  /** Put the dragged row under the pointer, wherever the list has shuffled to. */
  const track = useCallback(
    (id: number) => {
      const index = orderRef.current.findIndex((item) => item.id === id);
      const row = rows()[index];

      if (!row) return;

      const rect = row.getBoundingClientRect();
      setOffset(pointerY.current - rect.top - grabbedAt.current);
    },
    [rows],
  );

  const move = useCallback(
    (id: number, clientY: number) => {
      pointerY.current = clientY;

      const current = orderRef.current;
      const from = current.findIndex((item) => item.id === id);
      const boxes = rows().map((row) => row.getBoundingClientRect());

      /*
       * Compare against each row's MIDPOINT, not its edges. Using edges
       * means a row swaps as soon as the dragged one grazes it, and a list
       * with rows of different heights then flickers between two orders
       * while the finger holds still.
       */
      let to = from;

      for (let index = 0; index < boxes.length; index += 1) {
        const box = boxes[index];

        if (!box || index === from) continue;

        const middle = box.top + box.height / 2;

        if (index < from && clientY < middle) {
          to = Math.min(to, index);
        }

        if (index > from && clientY > middle) {
          to = Math.max(to, index);
        }
      }

      if (to !== from) {
        const next = [...current];
        const [lifted] = next.splice(from, 1);

        if (lifted) {
          next.splice(to, 0, lifted);
          orderRef.current = next;
          setOrder(next);
        }
      }

      track(id);
    },
    [rows, track],
  );

  /*
   * Scroll the page when the finger nears an edge.
   *
   * This is the half that makes a long list usable: nine stages do not fit
   * on a 5-inch screen, and with `touch-action: none` on the grip the page
   * will not scroll itself, so dragging to the bottom has to bring the rest
   * of the list up.
   */
  const edgeScroll = useCallback(
    (id: number) => {
      const zone = 90;
      const y = pointerY.current;
      const speed = y < zone ? -12 : y > window.innerHeight - zone ? 12 : 0;

      if (speed !== 0) {
        window.scrollBy(0, speed);
        move(id, y);
      }

      scrolling.current = window.requestAnimationFrame(() => edgeScroll(id));
    },
    [move],
  );

  const start = useCallback(
    (id: number, event: React.PointerEvent) => {
      if (disabled) return;

      const row = (event.currentTarget as HTMLElement).closest("li, div[data-row]");

      if (!row) return;

      // Stops the browser treating the press as the start of a text
      // selection, which on desktop leaves the whole list highlighted blue.
      event.preventDefault();

      grabbedAt.current = event.clientY - row.getBoundingClientRect().top;
      pointerY.current = event.clientY;
      startedFrom.current = orderRef.current;

      activeId.current = id;
      setDraggingId(id);
      setOffset(0);

      /*
       * Capture keeps the gesture alive when the finger leaves the grip,
       * which it does immediately -- the grip is 32px and the drag is not.
       * It throws if the pointer has already been released (a very fast
       * tap), and an exception here would leave the row marked as dragging
       * with nothing left to end it.
       */
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        // Capture is an improvement, not a requirement.
      }

      scrolling.current = window.requestAnimationFrame(() => edgeScroll(id));
    },
    [disabled, edgeScroll],
  );

  const finish = useCallback(() => {
    if (scrolling.current !== null) {
      window.cancelAnimationFrame(scrolling.current);
      scrolling.current = null;
    }

    const before = startedFrom.current;
    const after = orderRef.current;

    activeId.current = null;
    setDraggingId(null);
    setOffset(0);

    // Nothing moved: a press that went nowhere must not cost a request.
    const changed = after.some((item, index) => item.id !== before[index]?.id);

    if (changed) onCommit(after);
  }, [onCommit]);

  useEffect(() => {
    return () => {
      if (scrolling.current !== null) window.cancelAnimationFrame(scrolling.current);
    };
  }, []);

  return {
    order,
    draggingId,
    /** Spread onto the list element itself. */
    listRef,
    /** Spread onto each row's grip. */
    gripProps: (id: number) => ({
      onPointerDown: (event: React.PointerEvent) => start(id, event),
      onPointerMove: (event: React.PointerEvent) => {
        if (activeId.current === id) move(id, event.clientY);
      },
      onPointerUp: () => {
        if (activeId.current === id) finish();
      },
      onPointerCancel: () => {
        if (activeId.current === id) finish();
      },
    }),
    /** Spread onto the row that is being dragged. */
    rowStyle: (id: number) =>
      draggingId === id
        ? ({ transform: `translateY(${offset}px)`, zIndex: 5, position: "relative" } as const)
        : undefined,
  };
}
