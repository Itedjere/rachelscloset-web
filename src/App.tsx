import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import { useAuth } from "./hooks/useAuth";
import AlertSettings from "./pages/AlertSettings";
import Home from "./pages/Home";
import Arrangement from "./pages/Arrangement";
import BankAccount from "./pages/BankAccount";
import BusinessCard from "./pages/BusinessCard";
import Claim from "./pages/Claim";
import Garments from "./pages/Garments";
import MeasurementAccess from "./pages/MeasurementAccess";
import Measurements from "./pages/Measurements";
import Notifications from "./pages/Notifications";
import OrderDetail from "./pages/OrderDetail";
import OrderNew from "./pages/OrderNew";
import OrderPaid from "./pages/OrderPaid";
import Portfolio from "./pages/Portfolio";
import Subscription from "./pages/Subscription";
import SubscriptionPaid from "./pages/SubscriptionPaid";
import Orders from "./pages/Orders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import Disputes from "./pages/admin/Disputes";
import HeldReviews from "./pages/admin/HeldReviews";
import People from "./pages/admin/People";
import Customers from "./pages/Customers";
import ForgotPin from "./pages/ForgotPin";
import PinReset from "./pages/PinReset";
import Settings from "./pages/admin/Settings";
import StepLibrary from "./pages/admin/StepLibrary";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/sign-in" element={<SignIn />} />

        {/*
          Claiming is deliberately outside ProtectedRoute: the whole point is
          that this person has no account yet. Both spellings exist because
          the QR and WhatsApp channels carry a token and the spoken-code
          channel carries nothing at all.
        */}
        <Route path="/claim" element={<Claim />} />
        <Route path="/claim/:token" element={<Claim />} />

        {/*
          Also outside ProtectedRoute: somebody who has forgotten her PIN
          cannot sign in to reach a page behind sign-in. Both spellings,
          because the link carries a token and the spoken code carries
          nothing at all.
        */}
        <Route path="/reset" element={<PinReset />} />
        <Route path="/reset/:token" element={<PinReset />} />
        <Route path="/forgot" element={<ForgotPin />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersForRole />
            </ProtectedRoute>
          }
        />
        {/* Before /orders/:orderId, or "new" reads as an order id. */}
        <Route
          path="/orders/new"
          element={
            <RoleRoute allow={["tailor"]}>
              <OrderNew />
            </RoleRoute>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/paid"
          element={
            <ProtectedRoute>
              <OrderPaid />
            </ProtectedRoute>
          }
        />
        {/* Her own. */}
        <Route
          path="/measurements"
          element={
            <ProtectedRoute>
              <Measurements />
            </ProtectedRoute>
          }
        />
        {/* Her own customers: the people she has sewn for. */}
        <Route
          path="/customers"
          element={
            <RoleRoute allow={["tailor"]}>
              <Customers />
            </RoleRoute>
          }
        />
        {/* A customer's, for the tailor working with her. */}
        <Route
          path="/customers/:customerId/measurements"
          element={
            <RoleRoute allow={["tailor"]}>
              <Measurements />
            </RoleRoute>
          }
        />
        <Route
          path="/settings/measurement-access"
          element={
            <ProtectedRoute>
              <MeasurementAccess />
            </ProtectedRoute>
          }
        />

        {/* Not for customers: the catalogue an admin curates and a tailor
            arranges her stages within. A customer's stages are on her order. */}
        <Route
          path="/garments"
          element={
            <RoleRoute allow={["tailor", "admin"]}>
              <Garments />
            </RoleRoute>
          }
        />
        <Route
          path="/garments/:garmentTypeId/steps"
          element={
            <RoleRoute allow={["tailor", "admin"]}>
              <Arrangement />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminOrders />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/orders/:orderId"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminOrderDetail />
            </RoleRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <RoleRoute allow={["tailor"]}>
              <Subscription />
            </RoleRoute>
          }
        />
        <Route
          path="/subscription/paid"
          element={
            <RoleRoute allow={["tailor"]}>
              <SubscriptionPaid />
            </RoleRoute>
          }
        />
        <Route
          path="/card"
          element={
            <RoleRoute allow={["tailor"]}>
              <BusinessCard />
            </RoleRoute>
          }
        />
        <Route
          path="/portfolio"
          element={
            <RoleRoute allow={["tailor"]}>
              <Portfolio />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RoleRoute allow={["admin"]}>
              <Settings />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute allow={["admin"]}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/people"
          element={
            <RoleRoute allow={["admin"]}>
              <People />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/disputes"
          element={
            <RoleRoute allow={["admin"]}>
              <Disputes />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <RoleRoute allow={["admin"]}>
              <HeldReviews />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/steps"
          element={
            <RoleRoute allow={["admin"]}>
              <StepLibrary />
            </RoleRoute>
          }
        />
        <Route
          path="/settings/bank"
          element={
            <RoleRoute allow={["tailor"]}>
              <BankAccount />
            </RoleRoute>
          }
        />
        <Route
          path="/settings/alerts"
          element={
            <ProtectedRoute>
              <AlertSettings />
            </ProtectedRoute>
          }
        />

        {/* A notification can point anywhere, including at a page a later
            section has not built yet. Home is a better landing than a blank. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * "Your orders" for the two people on them; "All orders" for an admin.
 *
 * The list behind /orders is scoped to orders the viewer is ON, and an admin
 * is never the customer or the tailor -- so for her it was an empty page with
 * an Orders link pointing at it. An old bookmark or a typed address lands her
 * on the list that is actually hers.
 */
function OrdersForRole() {
  const { user } = useAuth();

  if (user?.role === "admin") return <Navigate to="/admin/orders" replace />;

  return <Orders />;
}
