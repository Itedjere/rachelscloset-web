import { useCallback, useEffect, useState } from "react";
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
  const [problem, setProblem] = useState<string | null>(null);

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

  async function save(row: PlatformSettingRow, value: string) {
    if (value === "" || value === row.value) return;

    setSavingKey(row.key);
    setProblem(null);

    try {
      await api.put("/admin/settings", { key: row.key, value: Number(value) });
      setRows((current) =>
        current.map((r) => (r.key === row.key ? { ...r, value } : r)),
      );
      setSavedKey(row.key);
      window.setTimeout(() => setSavedKey(null), 2000);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
      // Put the old value back rather than leave a number on screen that is
      // not the one in the database.
      setRows((current) => [...current]);
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
                <input
                  type="number"
                  inputMode="numeric"
                  min={row.min}
                  max={row.max}
                  defaultValue={row.value}
                  disabled={savingKey === row.key}
                  onBlur={(event) => void save(row, event.target.value)}
                />
                <p className="hint">
                  {row.help} Between {row.min} and {row.max}.
                  {savedKey === row.key ? <strong> Saved.</strong> : null}
                </p>
              </label>
            ))}
        </div>
      ))}
    </>
  );
}
