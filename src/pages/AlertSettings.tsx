import { useCallback, useEffect, useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { api, errorMessage } from "../lib/api";
import type { NotificationGroup, Preferences } from "../types/api";

interface PreferencesResponse {
  data: { groups: NotificationGroup[]; preferences: Preferences };
}

interface Device {
  id: number;
  label: string;
  created_at: string;
}

/** What to say about this device, and whether there is a button worth showing. */
function pushCopy(state: ReturnType<typeof usePushNotifications>["state"]) {
  switch (state) {
    case "granted":
      return { text: "This device will buzz when something happens.", action: "off" } as const;
    case "default":
      return { text: "This device is not set up for alerts yet.", action: "on" } as const;
    case "denied":
      return {
        text: "This browser is blocking alerts. Turn notifications back on for this site in your browser settings.",
        action: null,
      } as const;
    case "needs-install":
      // Not a corner case worth hiding: an iPhone is a normal thing for a
      // customer to have, and this is the only way push works on one.
      return {
        text: "On iPhone, alerts only work once you add this site to your Home Screen. Tap Share, then Add to Home Screen.",
        action: null,
      } as const;
    case "unconfigured":
      return { text: "Alerts are not switched on for this site yet.", action: null } as const;
    default:
      return { text: "This browser cannot show alerts.", action: null } as const;
  }
}

export default function AlertSettings() {
  const { state, busy, problem: pushProblem, enable, disable } = usePushNotifications();

  // null until loaded, so an account offered no switches (an admin) is told
  // so rather than shown an empty card while the request is in flight.
  const [groups, setGroups] = useState<NotificationGroup[] | null>(null);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [devices, setDevices] = useState<Device[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      const response = await api.get<{ data: Device[] }>("/push/subscriptions");
      setDevices(response.data);
    } catch {
      // The list is informational; failing to load it should not take the
      // switches down with it.
    }
  }, []);

  useEffect(() => {
    api
      .get<PreferencesResponse>("/notifications/preferences")
      .then((response) => {
        setGroups(response.data.groups);
        setPreferences(response.data.preferences);
      })
      .catch((error: unknown) => setProblem(errorMessage(error)));
  }, []);

  // Re-read whenever this device is hooked up or unhooked, so the list below
  // matches what the button above just did.
  useEffect(() => {
    void loadDevices();
  }, [state, loadDevices]);

  async function save(next: Preferences) {
    setPreferences(next);
    setSaving(true);
    setSaved(false);
    setProblem(null);

    try {
      await api.put("/notifications/preferences", { preferences: next });
      setSaved(true);
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function forget(id: number) {
    try {
      await api.delete(`/push/subscriptions?id=${id}`);
      setDevices((current) => current.filter((device) => device.id !== id));
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    }
  }

  const copy = pushCopy(state);

  return (
    <>
      <div className="page-head">
        <h1>Alerts</h1>
        <p>What your phone tells you, and when.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}
      {pushProblem ? <p className="notice bad">{pushProblem}</p> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>This device</h2>
        <p style={{ color: "var(--ink-soft)" }}>{copy.text}</p>

        {copy.action === "on" ? (
          <button type="button" className="btn" onClick={() => void enable()} disabled={busy}>
            {busy ? "Setting up…" : "Turn on alerts"}
          </button>
        ) : null}

        {copy.action === "off" ? (
          <button type="button" className="btn ghost" onClick={() => void disable()} disabled={busy}>
            {busy ? "Turning off…" : "Turn off on this device"}
          </button>
        ) : null}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>What to tell me about</h2>

        {/* Said plainly, because it is the thing people get wrong about a page
            like this: turning a switch off stops the phone buzzing, it does not
            hide what happened. The record is not something a toggle can erase. */}
        <p className="notice info">
          Turning something off only stops your phone buzzing. You will still find everything in
          your notifications list.
        </p>

        {groups?.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>
            Every alert your account gets is about the account itself, and those cannot be turned
            off.
          </p>
        ) : null}

        {groups?.map((group) => (
          <label className="switch-row" key={group.key}>
            <div className="text">
              <div className="label">{group.label}</div>
              <div className="hint">{group.hint}</div>
            </div>
            <input
              type="checkbox"
              checked={preferences[group.key] ?? true}
              disabled={saving}
              onChange={(event) => void save({ ...preferences, [group.key]: event.target.checked })}
            />
          </label>
        ))}

        {saved ? <p className="notice info">Saved.</p> : null}
      </div>

      {devices.length > 0 ? (
        <div className="card">
          <h2 style={{ fontSize: 18 }}>Devices getting alerts</h2>

          {devices.map((device) => (
            <div className="device" key={device.id}>
              <span className="label">{device.label}</span>
              <button type="button" className="btn quiet" onClick={() => void forget(device.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
