import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
import Pager from "../components/Pager";
import { api, errorMessage } from "../lib/api";
import { longDate } from "../lib/format";
import type { MyCustomer } from "../types/api";

interface CustomerPage {
  data: MyCustomer[];
  meta: { current_page: number; last_page: number; total: number };
}

/**
 * The people she has sewn for, and the quickest way to sew for them again.
 *
 * Paged and searched on the server: a busy shop's list outgrows one screen,
 * and a search that only filtered the page on screen would miss everybody on
 * page two. The server searches only inside her own customers, so the box
 * below can never find anybody she has not had an order with. Most recent
 * first, because the customer she wants is usually the one in last week.
 */
export default function Customers() {
  const [result, setResult] = useState<CustomerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  /*
   * Asked a moment after she stops typing, not on every key. On a slow
   * connection a request per letter arrives out of order, and the list
   * flickers through results for "A", "Am", "Ama" after she has finished.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(typed.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [typed]);

  // The newest request wins: a slower reply to an older search must not
  // land on top of the answer she is now looking at.
  const latest = useRef(0);

  useEffect(() => {
    const ticket = ++latest.current;
    const params = new URLSearchParams({ page: String(page) });

    if (query !== "") params.set("q", query);

    setLoading(true);

    api
      .get<CustomerPage>(`/customers?${params.toString()}`)
      .then((response) => {
        if (ticket !== latest.current) return;
        setResult(response);
        setProblem(null);
      })
      .catch((error: unknown) => {
        if (ticket === latest.current) setProblem(errorMessage(error));
      })
      .finally(() => {
        if (ticket === latest.current) setLoading(false);
      });
  }, [query, page]);

  const customers = result?.data ?? [];
  const total = result?.meta.total ?? 0;

  // Nobody at all, as opposed to nobody matching a search.
  const noCustomersYet = result !== null && total === 0 && query === "";

  return (
    <>
      <div className="page-head">
        <h1>Your customers</h1>
        <p>Everybody you have made something for. Start a new order for any of them.</p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {noCustomersYet ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Nobody yet. Your customers appear here after their first order with you.
          </p>
          <Link className="btn" to="/orders/new">
            Open an order
          </Link>
        </div>
      ) : (
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="customer-search">Find one of your customers</label>
          <input
            id="customer-search"
            type="search"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Her name, or part of her phone number"
            autoComplete="off"
          />
          {result && query !== "" ? (
            <p className="hint">
              {total === 0
                ? "None of your customers match that."
                : total === 1
                  ? "1 of your customers matches."
                  : `${total} of your customers match.`}
            </p>
          ) : null}
        </div>
      )}

      {result === null && loading ? <p className="empty">Loading…</p> : null}

      {/* Dimmed while the next page or search is on its way, rather than
          emptied: an empty list for half a second reads as "nobody". */}
      <ul className={`customer-list${loading && result ? " is-loading" : ""}`}>
        {customers.map((customer) => (
          <li key={customer.id} className="customer-row">
            <Avatar name={customer.name} url={customer.avatar_url} size={48} />

            <div className="customer-row__main">
              <strong>{customer.name}</strong>
              {/* Tap to ring her -- the reason most people open this list. */}
              <a className="customer-row__phone" href={`tel:${customer.phone}`}>
                {customer.phone}
              </a>
              <span className="hint">
                {customer.orders_count === 1 ? "1 order" : `${customer.orders_count} orders`}
                {customer.last_order_at ? ` · last on ${longDate(customer.last_order_at)}` : ""}
              </span>
              <span className="customer-row__tags">
                {customer.live_orders_count > 0 ? (
                  <span className="status-pill">
                    {customer.live_orders_count === 1
                      ? "1 order on now"
                      : `${customer.live_orders_count} orders on now`}
                  </span>
                ) : null}
                {!customer.claimed ? <span className="status-pill">No account yet</span> : null}
              </span>
            </div>

            <div className="customer-row__actions">
              <Link
                className="btn"
                to={`/orders/new?phone=${encodeURIComponent(customer.phone)}`}
              >
                <Icon name="check" size={16} /> New order
              </Link>
              {/* Only where it would open: a button that leads to "not found"
                  on her own customer list would read as the app being broken. */}
              {customer.can_see_measurements ? (
                <Link className="btn quiet" to={`/customers/${customer.id}/measurements`}>
                  <Icon name="ruler" size={16} /> Measurements
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {result ? (
        <Pager
          page={result.meta.current_page}
          lastPage={result.meta.last_page}
          busy={loading}
          onPage={(next) => {
            setPage(next);
            // A new page starts at the top of the list, not wherever the
            // previous one was scrolled to.
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}
    </>
  );
}
