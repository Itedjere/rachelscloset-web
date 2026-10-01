import { useCallback, useEffect, useState } from "react";
import ActionProblem from "../../components/ActionProblem";
import MoneyInput from "../../components/MoneyInput";
import { api, errorMessage } from "../../lib/api";
import type { PlatformSettingRow } from "../../types/api";

/**
 * The numbers an admin is expected to revise.
 *
 * Every one of these is an operational judgement rather than a constant --
 * the seeder has said so since Section 1 -- and until now the only way to
 * change one was a database client, which is fine for a developer and
 * useless to the person running the business.
 *
 * Saved one field at a time, on blur. A settings page with a single Save
 * button at the bottom is a page where you change one number, get distracted,
 * and lose it.
 */
export default function Settings() {
  const [rows, setRows] = useState<PlatformSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  // Loading only; a refused value shows under its own field.
  const [problem, setProblem] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: PlatformSettingRow[] }>("/admin/settings");
      setRows(response.data);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Whether it saved, so a controlled row can put its old value back. */
  async function save(row: PlatformSettingRow, value: string): Promise<boolean> {
    if (value === "" || value === row.value) return true;

    setSavingKey(row.key);
    setFailed(null);

    try {
      // A phone row goes as text: Number("08152070480") drops the leading
      // zero and turns a valid number into an invalid one.
      const response = await api.put<{ data: { value: string } }>("/admin/settings", {
        key: row.key,
        value: row.phone ? value : Number(value),
      });
      // The server's copy, which for a phone is the normalised form.
      setRows((current) =>
        current.map((r) => (r.key === row.key ? { ...r, value: response.data.value } : r)),
      );
      setSavedKey(row.key);
      window.setTimeout(() => setSavedKey(null), 2000);

      return true;
    } catch (error: unknown) {
      setFailed({ key: row.key, message: errorMessage(error) });
      // Put the old value back rather than leave a number on screen that is
      // not the one in the database.
      setRows((current) => [...current]);

      return false;
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) return <p className="empty">Loading…</p>;

  const groups = [...new Set(rows.map((row) => row.group))];

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p>The numbers that govern how the platform behaves. Each one saves as you leave it.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {groups.map((group) => (
        <div className="card" style={{ marginBottom: 16 }} key={group}>
          <h2 style={{ fontSize: 18 }}>{group}</h2>

          {rows
            .filter((row) => row.group === group)
            .map((row) => (
              <label className="field setting" key={row.key}>
                <span>{row.label}</span>
                {/* Two of these rows are naira and the rest are days,
                    counts and percentages. The server says which. */}
                {row.phone ? (
                  <PhoneSetting row={row} busy={savingKey === row.key} onSave={save} />
                ) : row.money ? (
                  <MoneySetting row={row} busy={savingKey === row.key} onSave={save} />
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={row.min}
                    max={row.max}
                    defaultValue={row.value}
                    disabled={savingKey === row.key}
                    onBlur={(event) => void save(row, event.target.value)}
                  />
                )}
                <p className="hint">
                  {row.help}
                  {row.phone ? null : ` Between ${row.min} and ${row.max}.`}
                  {savedKey === row.key ? <strong> Saved.</strong> : null}
                </p>
                {/* Under the field that was refused -- this page is long, and
                    each row saves as it is left, so the top is nowhere near. */}
                <ActionProblem message={failed?.key === row.key ? failed.message : null} />
              </label>
            ))}
        </div>
      ))}
    </>
  );
}

/**
 * A price, grouped as it is typed.
 *
 * Its own component because the rest of this screen is uncontrolled -- every
 * other row saves a `defaultValue` on blur -- and a field that reformats
 * while you type has to be controlled. Keeping that local means the money
 * rows do not make the other eleven controlled for nothing.
 */
function MoneySetting({
  row,
  busy,
  onSave,
}: {
  row: PlatformSettingRow;
  busy: boolean;
  onSave: (row: PlatformSettingRow, value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(row.value);

  return (
    <span onBlur={() => void onSave(row, value)}>
      <MoneyInput value={value} onChange={setValue} disabled={busy} max={String(row.max)} />
    </span>
  );
}

/**
 * The help line's phone number.
 *
 * Controlled, like the money rows, so it can show the stored form once saved
 * ("+234 815..." comes back as 0815...) and snap back to the working number
 * if the new one is refused -- a half-typed number left on screen would look
 * saved when the page a locked-out person reads still shows the old one.
 */
function PhoneSetting({
  row,
  busy,
  onSave,
}: {
  row: PlatformSettingRow;
  busy: boolean;
  onSave: (row: PlatformSettingRow, value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(row.value);

  useEffect(() => setValue(row.value), [row.value]);

  return (
    <input
      type="tel"
      inputMode="tel"
      autoComplete="off"
      value={value}
      disabled={busy}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() =>
        void onSave(row, value.trim()).then((ok) => {
          if (!ok) setValue(row.value);
        })
      }
    />
  );
}
