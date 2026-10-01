import { Link, Navigate } from "react-router-dom";
import Icon from "../components/Icon";
import ListingBanner from "../components/ListingBanner";
import { useAuth } from "../hooks/useAuth";

/*
 * A placeholder dashboard, and honest about it.
 *
 * The real one -- figures, and what needs attention today -- is Section 17.
 * Inventing those numbers here now would only have to be torn out. What this
 * does do is point at the parts that are finished, so somebody signing in can
 * find them without reading the sidebar twice.
 *
 * The voice recorder used to live here as a demo, because it had nowhere else
 * to be. It now has a real home in the step library, so it has gone.
 */
export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTailor = user?.role === "tailor";

  /*
   * An admin's dashboard is a different page with a different job — what is
   * waiting and what has stopped running, rather than a menu. One entry
   * point still, so a notification tapped on a lock screen lands somewhere
   * sensible whoever opens it.
   */
  if (isAdmin) return <Navigate to="/admin" replace />;

  return (
    <>
      <div className="page-head">
        <h1>Hello, {user?.name}</h1>
        <p>
          {isAdmin
            ? "Every order on the platform, and the library the stages come from."
            : isTailor
              ? "Your orders, and how each garment is coming along."
              : "Your orders, and how far along each one is."}
        </p>
      </div>

      {/* Silent unless there is something to say. The backstop for the
          reminder cron, which is only ever a courtesy. */}
      <ListingBanner />

      <div className="tile-grid">
        {/* First, because it is what the platform is for. */}
        <Link className="tile" to={isAdmin ? "/admin/orders" : "/orders"}>
          <Icon name="check" size={22} />
          <h2>{isAdmin ? "All orders" : "Orders"}</h2>
          <p>
            {isAdmin
              ? "Every order, what has been paid, and what is owed."
              : isTailor
                ? "Tick off each stage as you finish it. She is told every time."
                : "Follow each stage of your garment as your tailor finishes it."}
          </p>
        </Link>

        {isTailor ? (
          <Link className="tile" to="/customers">
            <Icon name="user" size={22} />
            <h2>Your customers</h2>
            <p>Everybody you have sewn for. Start a new order for any of them in one tap.</p>
          </Link>
        ) : null}

        {/* Not a customer's page -- the route refuses her too. */}
        {isAdmin || isTailor ? (
          <Link className="tile" to="/garments">
            <Icon name="garment" size={22} />
            <h2>Garments</h2>
            <p>
              {isAdmin
                ? "What customers can order, and the stages each one goes through."
                : "See the stages of each garment, and put them in the order you work."}
            </p>
          </Link>
        ) : null}

        {isAdmin ? (
          <Link className="tile" to="/admin/steps">
            <Icon name="list" size={22} />
            <h2>Step library</h2>
            <p>
              Every stage a garment can pass through — and the recording of what each one means.
            </p>
          </Link>
        ) : null}

        {/* A tailor with no bank details still gets paid, but the money waits
            as `pending` -- worth a tile rather than being buried in settings. */}
        {isTailor ? (
          <Link className="tile" to="/settings/bank">
            <Icon name="check" size={22} />
            <h2>Where you get paid</h2>
            <p>Where Rachel's Closet sends your money once an order is finished.</p>
          </Link>
        ) : null}

        <Link className="tile" to="/settings/alerts">
          <Icon name="cog" size={22} />
          <h2>Alerts</h2>
          <p>Turn on notifications so your phone tells you when something happens.</p>
        </Link>
      </div>
    </>
  );
}
