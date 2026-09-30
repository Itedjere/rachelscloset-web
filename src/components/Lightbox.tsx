import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export interface LightboxSlide {
  /** Stable across renders; used as the React key. */
  id: string | number;
  /** Full-size source. May be a blob: URL for a file behind the token. */
  url: string;
  /** Thumbnail source, if a cheaper one exists. Falls back to `url`. */
  thumb?: string;
  caption?: string | null;
  alt?: string;
}

/**
 * One photograph, large, with a way through the rest.
 *
 * Built rather than installed. The obvious move is a lightbox library, and
 * the reason not to is recorded in CLAUDE.md §3.5: the reference theme this
 * design came from loads 18 scripts weighing 1.12MB before a single image,
 * and this whole product is smaller than that. The public Blade site has no
 * build step and a printed QR code pointing at it, so a CDN script there is a
 * dependency in the path of a piece of cardboard that cannot be reissued.
 *
 * What a library would have given us is below in about 150 lines: arrows,
 * a thumbnail rail, keyboard and Escape, swipe, a focus trap and a scroll
 * lock. A native <dialog> does most of it.
 */
export default function Lightbox({
  slides,
  index,
  onIndex,
  onClose,
  actions,
}: {
  slides: LightboxSlide[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Buttons that belong to the photograph on screen — remove, hide, and so on. */
  actions?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  /*
   * Pointer events rather than touch events, so one code path covers a
   * finger, a mouse and a pen. CLAUDE.md §3.5 records the same finding for
   * the public carousels: touch gives swipe for free and a mouse gives
   * nothing, so the mouse is the case you have to write.
   *
   * `from` is where the gesture started; null means nothing is being
   * dragged. `dx` drives the live transform, so the photograph moves with
   * the hand instead of jumping when it is let go.
   */
  const from = useRef<number | null>(null);
  const [dx, setDx] = useState(0);

  /*
   * State, not just the ref above: a ref changing does not re-render, so a
   * class derived from it would not appear until something else happened to
   * cause one. The grab cursor has to land on pointerdown.
   */
  const [dragging, setDragging] = useState(false);

  /*
   * Which way the last move went, so the incoming photograph enters from the
   * side it came from. Without it a slide is just a twitch -- it is the
   * direction that tells you the gallery has a shape and where you are in it.
   */
  const lastIndex = useRef(index);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);

  const count = slides.length;
  const slide = slides[index];

  // Wraps, so the arrows never dead-end on a gallery of three.
  const go = useCallback(
    (by: number) => {
      if (count > 0) onIndex((index + by + count) % count);
    },
    [count, index, onIndex],
  );

  /*
   * showModal() rather than an open attribute: it is what gives the focus
   * trap, the inert background and Escape, none of which is worth
   * reimplementing by hand.
   */
  useEffect(() => {
    const element = dialog.current;

    if (!element || element.open) return;

    element.showModal();

    // A modal over a page that still scrolls behind it reads as broken.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
      if (element.open) element.close();
    };
  }, []);

  useEffect(() => {
    if (index === lastIndex.current) return;

    /*
     * Shortest way round, so wrapping from the last photograph to the first
     * still reads as forward -- which is what the arrow that did it said.
     * A jump from a thumbnail takes whichever direction is nearer.
     */
    const forward = (index - lastIndex.current + slides.length) % slides.length;

    setDirection(forward <= slides.length / 2 ? "next" : "prev");
    lastIndex.current = index;
  }, [index, slides.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Keep the current thumbnail in view when the arrows or keyboard move past
  // the end of the visible rail.
  useEffect(() => {
    rail.current
      ?.querySelector<HTMLElement>('[data-current="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index]);

  if (!slide) return null;

  return (
    <dialog
      ref={dialog}
      className="lb"
      aria-label="Photograph"
      // Escape fires `cancel`, and the browser would otherwise close the
      // dialog without telling React, leaving the component mounted.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Only a click on the backdrop itself, never one that bubbled up
        // from the picture or the controls.
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="lb__top">
        <span className="lb__count">
          {index + 1} of {count}
        </span>
        <button type="button" className="lb__icon" onClick={onClose} aria-label="Close">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div
        ref={stage}
        className={`lb__stage${dragging ? " is-dragging" : ""}`}
        onPointerDown={(event) => {
          // A press on an arrow is a click, not the start of a drag.
          if ((event.target as HTMLElement).closest("button")) return;
          if (count < 2) return;

          from.current = event.clientX;
          setDx(0);
          setDragging(true);

          /*
           * Capture, so the gesture still finishes if the pointer leaves the
           * stage -- letting go over the backdrop used to leave the
           * photograph stranded mid-drag.
           */
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (from.current === null) return;

          setDx(event.clientX - from.current);
        }}
        onPointerUp={(event) => {
          if (from.current === null) return;

          const moved = event.clientX - from.current;
          const width = stage.current?.clientWidth ?? 0;

          /*
           * A fifth of the stage, floored at 40px and capped at 140.
           *
           * A fixed pixel threshold is either impossible to reach on a phone
           * or triggered by a shaky tap on a desktop, so it scales -- but a
           * fifth of an 1100px stage is a 220px mouse drag, which is further
           * than anyone wants to push to see the next picture.
           */
          const threshold = Math.min(140, Math.max(40, width * 0.2));

          from.current = null;
          setDx(0);
          setDragging(false);

          if (Math.abs(moved) > threshold) go(moved < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          from.current = null;
          setDx(0);
          setDragging(false);
        }}
      >
        {count > 1 ? (
          <button
            type="button"
            className="lb__arrow lb__arrow--prev"
            onClick={() => go(-1)}
            aria-label="Previous photograph"
          >
            ‹
          </button>
        ) : null}

        {/*
          Keyed on the slide, so React builds a new element each time and the
          entry animation actually restarts -- reusing the node would leave
          the animation already finished and nothing would move.
        */}
        <img
          key={slide.id}
          className={direction ? `lb__img lb__img--${direction}` : "lb__img"}
          src={slide.url}
          alt={slide.alt ?? slide.caption ?? "Photograph"}
          draggable={false}
          /*
           * Inline while dragging only. The rest of the time the class-based
           * entry animation owns the transform, and a permanent inline one
           * would override every keyframe it has.
           */
          style={dx === 0 ? undefined : { transform: `translateX(${dx}px)`, transition: "none" }}
        />

        {count > 1 ? (
          <button
            type="button"
            className="lb__arrow lb__arrow--next"
            onClick={() => go(1)}
            aria-label="Next photograph"
          >
            ›
          </button>
        ) : null}
      </div>

      {slide.caption ? <p className="lb__caption">{slide.caption}</p> : null}

      {actions ? <div className="lb__actions">{actions}</div> : null}

      {/* The rail is what makes a gallery navigable rather than a queue. One
          photograph does not need one. */}
      {count > 1 ? (
        <div className="lb__rail" ref={rail}>
          {slides.map((item, position) => (
            <button
              type="button"
              key={item.id}
              className={`lb__thumb${position === index ? " lb__thumb--on" : ""}`}
              data-current={position === index}
              onClick={() => onIndex(position)}
              aria-label={`Photograph ${position + 1}`}
              aria-current={position === index}
            >
              <img src={item.thumb ?? item.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </dialog>
  );
}
