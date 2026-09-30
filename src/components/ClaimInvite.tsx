import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { ClaimInvite as Invite } from "../types/api";

/**
 * Handing a customer her own account.
 *
 * Nothing here sends an SMS or needs an email address, because this platform
 * has neither. What it has is that the two women are standing together at the
 * counter, so two of the three channels send nothing at all:
 *
 *   - she points her camera at the QR on this screen;
 *   - the tailor sends it from her own WhatsApp;
 *   - or the tailor reads six digits down a phone call.
 *
 * Until she claims it, she cannot see her own measurements and no second
 * tailor can either -- which is why this sits on the measurements page rather
 * than buried in a settings menu.
 */
export default function ClaimInvite({
  customer,
  why = "Until she does, she cannot see these measurements and no other tailor can either.",
}: {
  customer: { id: number; name: string };
  /** What she is missing without an account, in terms of the page it sits on. */
  why?: string;
}) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function issue() {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<{ data: Invite }>(`/customers/${customer.id}/claim-invite`);
      setInvite(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card invite" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18 }}>{customer.name} has not set up her account yet</h2>
      <p className="hint">{why} Give her one of these three.</p>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {!invite ? (
        <button type="button" className="btn" onClick={() => void issue()} disabled={busy}>
          {busy ? "Making it…" : "Set up her account"}
        </button>
      ) : (
        <div className="invite-channels">
          {/* 1. Nothing is sent. She points her camera at this screen. */}
          <div className="invite-qr">
            <div
              className="invite-qr-image"
              // The SVG comes from our own API, built by endroid from a link
              // we generated. No user input reaches it.
              dangerouslySetInnerHTML={{ __html: invite.qr_svg }}
            />
            <p className="hint">Let her scan this with her phone camera.</p>
          </div>

          <div className="invite-rest">
            {/* 2. Her own WhatsApp, prefilled. Not the Business API. */}
            <a
              className="btn"
              href={invite.whatsapp_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Send it on WhatsApp
            </a>

            {/*
              3. For when they are not together. The whole sentence to say,
              not just the digits: six numbers with no address beside them
              were a key with no door, and a tailor should not have to
              compose the instructions herself while on the phone. The
              address is shown without "https://", which nobody says aloud.
            */}
            <div className="invite-code">
              <span className="hint">Not together? Ring her and say:</span>
              <p className="invite-script">
                “Go to <strong>{invite.claim_page.replace(/^https?:\/\//, "")}</strong>. Type
                your phone number, then these six numbers:”
              </p>
              <strong>{invite.code}</strong>
              <span className="hint">
                She can also tap “My tailor read me six numbers” on the sign-in page.
              </span>
            </div>

            <button type="button" className="btn quiet" onClick={() => void issue()} disabled={busy}>
              Make a new one
            </button>

            <p className="hint">
              It stops working in two days, or as soon as she uses it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
