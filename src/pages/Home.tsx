import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../hooks/useAuth";

/*
 * A placeholder dashboard, and honest about it.
 *
 * The real one belongs to the sections that build orders and the production
 * tracker; inventing figures here now would only have to be torn out. What it
 * does do is point at the parts that are finished, so somebody signing in can
 * find them without reading the sidebar twice.
 *
 * The voice recorder used to live here as a demo, because it had nowhere else
 * to be. It now has a real home in the step library, so it has gone.
 */
export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="page-head">
        <h1>Hello, {user?.name}</h1>
        <p>
          {isAdmin
            ? "Orders and the production tracker are not built yet. The step library is."
            : "Orders and the production tracker are not built yet. You can already set up how your work is arranged."}
        </p>
      </div>

      <div className="tile-grid">
        <Link className="tile" to="/garments">
          <Icon name="garment" size={22} />
          <h2>Garments</h2>
          <p>
            {isAdmin
              ? "What customers can order, and the stages each one goes through."
              : "See the stages of each garment, and put them in the order you work."}
          </p>
        </Link>

        {isAdmin ? (
          <Link className="tile" to="/admin/steps">
            <Icon name="list" size={22} />
            <h2>Step library</h2>
            <p>
              Every stage a garment can pass through — and the recording of what each one means.
            </p>
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
