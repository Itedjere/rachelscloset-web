import { useEffect, useRef, useState } from "react";
import { formatDuration, formatFileSize } from "../lib/format";
import type { ServerConfig } from "../types/api";
import AudioPlayer from "./AudioPlayer";

const MAX_SECONDS = 120;

interface VoiceNoteRecorderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  /** The server's upload ceiling; null until it has been fetched. */
  limit: ServerConfig | null;
}

/**
 * Records a voice note with MediaRecorder and hands the File to the parent.
 *
 * This is the component Section 7's step library is built on, and the reason
 * the library works at all for somebody who reads poorly: an admin says what a
 * step means out loud, and every tailor after that listens instead of reading.
 *
 * Falls back to a plain file picker wherever MediaRecorder or the microphone is
 * unavailable -- an older browser, a denied permission, a non-HTTPS origin. All
 * three are ordinary here, not corner cases.
 */
export default function VoiceNoteRecorder({ value, onChange, limit }: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supported =
    typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  // Keep an object URL alive for whatever the current recording is.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(value);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [value]);

  // Release the microphone if the form unmounts mid-recording. Without this the
  // browser keeps showing a recording indicator over a page that has gone.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  /**
   * Reject an oversized file here rather than uploading it. PHP discards
   * anything over upload_max_filesize before Laravel can validate it, which
   * otherwise surfaces as an unexplained failure after a slow upload -- paid
   * for by the megabyte.
   */
  function accept(file: File | null) {
    setError(null);

    if (file && limit && file.size > limit.max_upload_kb * 1024) {
      setError(
        `That file is ${formatFileSize(file.size)}. The server accepts up to ${limit.max_upload_label}.`,
      );
      onChange(null);
      return;
    }

    onChange(file);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    setRecording(false);
  }

  async function startRecording() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        /*
         * Whatever the browser chose: webm/opus on Android Chrome, mp4/aac on
         * Safari. Named from the real mime type rather than hardcoded to .webm,
         * so the server sees an extension that matches the bytes -- the
         * validation rule checks content, and an iPhone recording called .webm
         * would be refused for no reason a person could act on.
         */
        const type = recorder.mimeType || "audio/webm";
        const extension = type.includes("mp4") || type.includes("aac") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type });

        accept(new File([blob], `voice-note.${extension}`, { type }));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((current) => {
          if (current + 1 >= MAX_SECONDS) stopRecording();
          return current + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone unavailable. You can attach an audio file instead.");
    }
  }

  function clearRecording() {
    setError(null);
    onChange(null);
    setSeconds(0);
  }

  return (
    <div className="recorder">
      {supported && !value ? (
        <button
          type="button"
          className={recording ? "btn danger" : "btn"}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? (
            <>
              <span className="rec-dot" />
              Stop ({formatDuration(seconds)})
            </>
          ) : (
            "Record voice note"
          )}
        </button>
      ) : null}

      {value ? (
        <>
          {previewUrl ? <AudioPlayer src={previewUrl} compact /> : null}
          <span className="size">{formatFileSize(value.size)}</span>
          <button type="button" className="btn ghost" onClick={clearRecording}>
            Remove
          </button>
        </>
      ) : (
        <label className="btn ghost" style={{ cursor: "pointer" }}>
          Attach audio file
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(event) => {
              accept(event.target.files?.[0] ?? null);
              // Let the same file be re-picked after an error.
              event.target.value = "";
            }}
          />
        </label>
      )}

      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
