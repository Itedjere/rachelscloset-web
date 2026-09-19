import { useCallback, useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { api, errorMessage } from "../lib/api";
import type { MeasurementAccessRow } from "../types/api";

/**
 * Who can see my measurements.
 *
 * A consent screen is only worth having if it is truthful, and the truthful
 * answer here is complicated: a tailor who is making something for you can
 * see them whether or not you have granted anything, and taking a grant back
 * while she is mid-garment does not stop her -- the cloth is cut and she has
 * the numbers on paper.
 *
 * So the page says that, in those words, rather than offering a switch that
 * quietly does less than it appears to. A control that lies is worse than no
 * control.
 */
export default function MeasurementAccess() {
  const [rows, setRows] = useState<MeasurementAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: MeasurementAccessRow[] }>("/measurement-access");
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

  async function toggle(row: MeasurementAccessRow) {
    if (row.id === null) return;

    setBusyId(row.id);
    setProblem(null);

    try {
      await api.post(`/measurement-access/${row.id}/${row.granted ? "revoke" : "grant"}`);
      await load();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="empty">Loading…</p>;

  return (
    <>
      <div className="page-head">
        <h1>Who can see my measurements</h1>
        <p>Your measurements are private. These are the only people who can open them.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {rows.length === 0 ? (
        <p className="empty">Nobody. Only you can see your measurements.</p>
      ) : (
        <div className="consent-list">
          {rows.map((row) => (
            <div className="card consent" key={row.id ?? `order-${row.tailor.id}`}>
              <div className="consent-who">
                <Avatar name={row.tailor.name ?? "?"} url={row.tailor.avatar_url} size={44} />
                <div>
                  <strong>{row.tailor.business_name ?? row.tailor.name}</strong>
                  <div className="hint">{row.reason}</div>
                </div>
              </div>

              <div className="consent-action">
                {/*
                  No link to revoke: her access comes from the garment she is
                  making, and it will end when that order does. Offering a
                  button here would be offering something that does nothing.
                */}
                {row.id === null ? (
                  <span className="pill">While she is sewing</span>
                ) : (
                  <button
                    type="button"
                    className={`btn ${row.granted ? "quiet" : ""}`}
                    onClick={() => void toggle(row)}
                    disabled={busyId === row.id}
                  >
                    {row.granted ? "Stop sharing" : "Allow again"}
                  </button>
                )}
              </div>

              {/*
                The honest caveat, shown only when it is actually true --
                revoked, but she can still see them because she is mid-order.
              */}
              {!row.granted && row.can_see_now ? (
                <p className="notice">
                  She can still see them until the garment she is making for you is finished.
                  We cannot take back what she has already written down.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
