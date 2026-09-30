import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { ResourceResponse } from "../types/api";

interface Bank {
  name: string;
  code: string;
}

interface StoredAccount {
  bank_code: string | null;
  account_number_tail: string | null;
  account_name: string | null;
  verified: boolean;
}

/**
 * Where a tailor is paid.
 *
 * Two steps, deliberately: she picks a bank and types a number, we ask the
 * bank what that account is called, and she confirms the name before anything
 * is saved. A transposed digit is obvious here and free to fix; after a
 * transfer it is somebody else's money.
 */
export default function BankAccount() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [stored, setStored] = useState<StoredAccount | null>(null);

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ResourceResponse<Bank[]>>("/banks")
      .then((r) => setBanks(r.data))
      .catch((error: unknown) => setProblem(errorMessage(error)));

    api
      .get<ResourceResponse<StoredAccount>>("/profile/bank")
      .then((r) => setStored(r.data))
      .catch(() => {
        // No profile yet, or not a tailor. The page says so below.
      });
  }, []);

  // Changing either field invalidates a name resolved from the old pair.
  useEffect(() => {
    setResolvedName(null);
    setSaved(false);
  }, [bankCode, accountNumber]);

  async function check() {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<ResourceResponse<{ account_name: string }>>(
        "/profile/bank/resolve",
        { bank_code: bankCode, account_number: accountNumber },
      );
      setResolvedName(response.data.account_name);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setProblem(null);

    try {
      const response = await api.post<ResourceResponse<StoredAccount>>("/profile/bank", {
        bank_code: bankCode,
        account_number: accountNumber,
      });
      setStored(response.data);
      setResolvedName(null);
      /*
       * Set last, and the fields are NOT cleared. Clearing them fires the
       * effect that invalidates a resolved name, which also clears this flag
       * -- so the confirmation never appeared. The panel above already shows
       * what is on file, so leaving the fields as she typed them costs
       * nothing.
       */
      setSaved(true);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const ready = bankCode !== "" && accountNumber.length === 10;

  return (
    <>
      <div className="page-head">
        <h1>Where you get paid</h1>
        <p>Only needed for orders where Rachel's Closet keeps the money until your customer collects.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}
      {saved ? <p className="notice info">Saved. Your money will be sent to this account.</p> : null}

      {stored?.verified ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18 }}>On file</h2>
          <dl className="facts">
            <div>
              <dt>Account name</dt>
              <dd>{stored.account_name}</dd>
            </div>
            <div>
              <dt>Account number</dt>
              {/* Last four only — there is no reason to send the whole number
                  back down to a browser once it is stored. */}
              <dd>•••• {stored.account_number_tail}</dd>
            </div>
          </dl>
          <p className="hint">Adding a different account below replaces this one.</p>
        </div>
      ) : (
        <p className="notice info">
          No account on file yet. Money from an order you have finished is still yours — it
          waits here until you add one.
        </p>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="bank">Your bank</label>
          <select id="bank" value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
            <option value="">Choose a bank</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="account">Account number</label>
          <input
            id="account"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            // Digits only: a predictive keyboard slipping in a space would
            // otherwise fail at the bank with nothing visible to explain it.
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="0123456789"
          />
          <p className="hint">Ten digits.</p>
        </div>

        {resolvedName ? (
          <div className="resolved-name">
            <span className="hint">The bank says this account belongs to</span>
            <strong>{resolvedName}</strong>
            <p className="hint">
              If that is not you, check the number before saving. We cannot get money back
              from the wrong account.
            </p>
          </div>
        ) : null}

        <div className="row-actions">
          {resolvedName ? (
            <button type="button" className="btn" onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Yes, that is me — save it"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => void check()} disabled={busy || !ready}>
              {busy ? "Checking…" : "Check this account"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
