import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { ResourceResponse, ServerConfig } from "../types/api";

/**
 * "I forgot my PIN" -- what to do, in one screen.
 *
 * There is no self-service reset, deliberately. Nothing on this platform
 * sends an SMS or needs an email address, so there is nothing to prove who
 * she is except a person on the phone; and a reset is admin-issued because a
 * tailor able to reset her customer's PIN could take that account over. So
 * the whole flow, as she sees it, is: ring this number, get six numbers,
 * type them in. This page says exactly that, and the number comes from a
 * setting an admin can change without a deploy.
 */
export default function ForgotPin() {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<ResourceResponse<ServerConfig>>("/config")
      .then((response) => setConfig(response.data))
      .catch(() => setConfig(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <p className="empty">Loading…</p>;

  const phone = config?.support_phone ?? null;

  return (
    <div className="card auth-card">
      <h1>Forgot your PIN?</h1>

      {/* Said first, because "just tell me what it was" is the natural
          question, and the answer is why a phone call is needed at all. */}
      <p className="hint">
        Nobody can look up your PIN, not even Rachel's Closet. Ring them, and they will check it
        is you and give you six numbers to choose a new one.
      </p>

      {phone ? (
        <div className="support-contact">
          {/* tel: dials on tap -- nothing to copy, nothing to read twice. */}
          <a className="btn block" href={`tel:${phone}`}>
            Call {spaced(phone)}
          </a>
          {config?.support_whatsapp ? (
            <a
              className="btn ghost block"
              href={config.support_whatsapp}
              target="_blank"
              rel="noreferrer noopener"
            >
              Message on WhatsApp
            </a>
          ) : null}
        </div>
      ) : (
        <p className="notice info">
          Contact Rachel's Closet and ask for six numbers to reset your PIN.
        </p>
      )}

      <p className="hint" style={{ marginTop: 20 }}>Already been given your six numbers?</p>
      <Link className="btn quiet block" to="/reset">
        I have my six numbers
      </Link>

      <p style={{ marginTop: 16 }}>
        <Link to="/sign-in">Back to sign in</Link>
      </p>
    </div>
  );
}

/** "0815 207 0480": how it is read aloud, and easier to check against a card. */
function spaced(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  return digits.length === 11
    ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    : phone;
}
