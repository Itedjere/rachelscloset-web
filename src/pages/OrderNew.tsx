import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import MoneyInput from "../components/MoneyInput";
import { ApiError, api, errorMessage } from "../lib/api";
import { naira } from "../lib/money";
import type { FoundCustomer, GarmentType, Order, ResourceResponse } from "../types/api";

/**
 * Opening an order.
 *
 * The tailor fills this in with the customer standing next to her, which is
 * why it starts with a phone number rather than a search box: the customer
 * reads out her number, and that is the whole lookup.
 */
export default function OrderNew() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<FoundCustomer | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookupProblem, setLookupProblem] = useState<string | null>(null);

  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [garmentTypeId, setGarmentTypeId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deposit, setDeposit] = useState("");
  const [escrow, setEscrow] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    api
      .get<ResourceResponse<GarmentType[]>>("/garment-types")
      .then((r) => setGarments(r.data))
      .catch((error: unknown) => setProblem(errorMessage(error)));
  }, []);

  async function findCustomer(event: React.FormEvent) {
    event.preventDefault();
    setLooking(true);
    setLookupProblem(null);
    setCustomer(null);

    try {
      const response = await api.get<ResourceResponse<FoundCustomer>>(
        `/customers/lookup?phone=${encodeURIComponent(phone)}`,
      );
      setCustomer(response.data);
    } catch (error: unknown) {
      setLookupProblem(errorMessage(error));
    } finally {
      setLooking(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!customer) return;

    setSaving(true);
    setProblem(null);
    setFieldErrors({});

    try {
      const response = await api.post<ResourceResponse<Order>>("/orders", {
        customer_id: customer.id,
        garment_type_id: Number(garmentTypeId),
        description: description || null,
        amount: Number(amount),
        deposit_amount: deposit ? Number(deposit) : 0,
        escrow,
        due_date: dueDate || null,
      });

      navigate(`/orders/${response.data.id}`);
    } catch (error: unknown) {
      if (error instanceof ApiError) setFieldErrors(error.errors);
      setProblem(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Open an order</h1>
        <p>Find the customer by her phone number, then say what you are making.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <form className="card" onSubmit={findCustomer} style={{ marginBottom: 16 }}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="phone">Customer phone number</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803 000 0003"
          />
        </div>

        <button type="submit" className="btn ghost" disabled={looking || phone.trim() === ""}>
          {looking ? "Looking…" : "Find customer"}
        </button>

        {lookupProblem ? (
          <p className="notice bad" style={{ marginTop: 12, marginBottom: 0 }}>
            {lookupProblem} Creating a customer from the shop floor comes with the measurements
            section.
          </p>
        ) : null}

        {customer ? (
          <div className="found-customer">
            <Avatar name={customer.name} url={customer.avatar_url} size={40} />
            <div>
              <strong>{customer.name}</strong>
              <div className="hint">{customer.phone}</div>
            </div>
            {!customer.claimed ? <span className="status-pill">Not claimed yet</span> : null}
          </div>
        ) : null}
      </form>

      {customer ? (
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label htmlFor="garment">What are you making?</label>
            <select id="garment" value={garmentTypeId} onChange={(e) => setGarmentTypeId(e.target.value)}>
              <option value="">Choose a garment</option>
              {garments.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {fieldErrors.garment_type_id ? (
              <p className="error">{fieldErrors.garment_type_id[0]}</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="description">Anything to remember</label>
            <input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Blue lace, long sleeve"
            />
          </div>

          <div className="field">
            <label htmlFor="amount">Price</label>
            <MoneyInput id="amount" value={amount} onChange={setAmount} />
            {fieldErrors.amount ? <p className="error">{fieldErrors.amount[0]}</p> : null}
          </div>

          <div className="field">
            <label htmlFor="deposit">Deposit now (optional)</label>
            <MoneyInput id="deposit" value={deposit} onChange={setDeposit} />
            <p className="hint">
              Leave empty if she pays it all on collection. A deposit is what makes an
              uncollected garment cost her something.
            </p>
            {fieldErrors.deposit_amount ? (
              <p className="error">{fieldErrors.deposit_amount[0]}</p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="due">Promised for (optional)</label>
            <input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <label className="switch-row" style={{ borderBottom: 0 }}>
            <div className="text">
              <div className="label">Hold the money until she collects</div>
              <div className="hint">
                The platform keeps it and pays you when the garment is handed over. Costs you
                nothing — the charge is absorbed.
              </div>
            </div>
            <input type="checkbox" checked={escrow} onChange={(e) => setEscrow(e.target.checked)} />
          </label>

          <div className="row-actions">
            <button type="submit" className="btn" disabled={saving || !garmentTypeId || !amount}>
              {saving ? "Opening…" : `Open order${amount ? ` for ${naira(amount)}` : ""}`}
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
