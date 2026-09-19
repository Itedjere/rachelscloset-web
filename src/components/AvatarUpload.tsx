import { useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { shrinkImage } from "../lib/image";
import type { ResourceResponse, User } from "../types/api";
import Avatar from "./Avatar";

interface AvatarUploadProps {
  user: User;
  onChange: (user: User) => void;
}

export default function AvatarUpload({ user, onChange }: AvatarUploadProps) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | null) {
    if (!file) return;

    setBusy(true);
    setProblem(null);

    try {
      // Shrunk before it is sent. A phone camera produces four or five
      // megabytes for something displayed at forty pixels, and that difference
      // is the whole upload on a patchy connection.
      const shrunk = await shrinkImage(file, "avatar");

      const body = new FormData();
      body.append("avatar", shrunk);

      const response = await api.post<ResourceResponse<User>>("/profile/avatar", body);
      onChange(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
      // Let the same file be re-picked after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.delete<ResourceResponse<User>>("/profile/avatar");
      onChange(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avatar-upload">
      <Avatar name={user.name} url={user.avatar_url} size={72} />

      <div className="row-actions" style={{ marginTop: 0 }}>
        <label className="btn ghost" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Working…" : user.avatar_url ? "Change photo" : "Add a photo"}
          <input
            ref={inputRef}
            type="file"
            // `capture` is deliberately absent: a tailor may well be picking a
            // photo somebody sent her on WhatsApp rather than taking a new one.
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={busy}
            onChange={(event) => void pick(event.target.files?.[0] ?? null)}
          />
        </label>

        {user.avatar_url ? (
          <button type="button" className="btn quiet" onClick={() => void remove()} disabled={busy}>
            Remove
          </button>
        ) : null}
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}
    </div>
  );
}
