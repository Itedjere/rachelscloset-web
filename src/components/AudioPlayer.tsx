import { useEffect, useRef, useState } from "react";
import { formatDuration } from "../lib/format";

/*
 * A fixed pseudo-waveform. Native <audio controls> cannot be themed
 * consistently across browsers -- each renders its own shadow DOM -- so the
 * whole transport is rebuilt here out of design-system tokens.
 *
 * This is not decoration. Playing a voice note is the primary way a tailor
 * reads a step, so the play button has to be the largest, most obvious thing
 * on the row and has to look the same on every cheap Android in the country.
 */
const BARS = [
  5, 9, 14, 8, 17, 11, 20, 13, 7, 16, 10, 19, 12, 6, 15, 9, 18, 11, 14, 8, 20, 13, 7, 17, 10, 16,
  12, 6, 15, 9, 13, 8,
];

interface AudioPlayerProps {
  src: string | null;
  /** Shown while the file is still being fetched. */
  loading?: boolean;
  /** Narrower variant, for a row in a list rather than a page of its own. */
  compact?: boolean;
}

export default function AudioPlayer({ src, loading = false, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const durationPrimed = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // A new source is a new recording: forget everything about the last one.
  useEffect(() => {
    durationPrimed.current = false;
    setDuration(null);
    setCurrentTime(0);
    setPlaying(false);
  }, [src]);

  /**
   * MediaRecorder blobs report a duration of Infinity until the file has been
   * seeked to the end, which is a long-standing Chrome behaviour. Seeking far
   * past the end forces the real duration to be computed, then we rewind.
   */
  function primeDuration(audio: HTMLAudioElement) {
    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
      return;
    }

    if (durationPrimed.current) return;
    durationPrimed.current = true;

    const onTimeUpdate = () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);

      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      audio.currentTime = 0;
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.currentTime = 1e101;
  }

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seekToFraction(fraction: number) {
    const audio = audioRef.current;
    if (!audio || duration === null) return;

    const target = Math.min(Math.max(fraction, 0), 1) * duration;
    audio.currentTime = target;
    setCurrentTime(target);
  }

  const progress = duration && duration > 0 ? currentTime / duration : 0;

  // Counts down while there is something to count down from, which is what a
  // listener actually wants to know; falls back to total length before playback.
  const remaining = duration === null ? null : Math.max(duration - currentTime, 0);
  const timeLabel =
    duration === null
      ? loading
        ? "···"
        : "—:—"
      : currentTime > 0
        ? `-${formatDuration(remaining ?? 0)}`
        : formatDuration(duration);

  return (
    <div className={`voice-note${compact ? " compact" : ""}`}>
      <button
        type="button"
        className="play"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <div
        className="waveform"
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration ?? 0}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatDuration(currentTime)} of ${duration === null ? "unknown" : formatDuration(duration)}`}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          seekToFraction((event.clientX - bounds.left) / bounds.width);
        }}
        onKeyDown={(event) => {
          if (duration === null) return;

          if (event.key === "ArrowRight") {
            event.preventDefault();
            seekToFraction((currentTime + 5) / duration);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            seekToFraction((currentTime - 5) / duration);
          } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            toggle();
          }
        }}
      >
        {BARS.map((height, index) => (
          <span
            key={index}
            className={index / BARS.length <= progress ? "played" : undefined}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <span className="voice-note-time">{timeLabel}</span>

      {src ? (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(event) => primeDuration(event.currentTarget)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={(event) => {
            setPlaying(false);
            event.currentTarget.currentTime = 0;
            setCurrentTime(0);
          }}
          hidden
        />
      ) : null}
    </div>
  );
}
