import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AlertSettings from "./pages/AlertSettings";
import Home from "./pages/Home";
import Arrangement from "./pages/Arrangement";
import BankAccount from "./pages/BankAccount";
import Garments from "./pages/Garments";
import Notifications from "./pages/Notifications";
import OrderDetail from "./pages/OrderDetail";
import OrderNew from "./pages/OrderNew";
import OrderPaid from "./pages/OrderPaid";
import Orders from "./pages/Orders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminOrders from "./pages/admin/AdminOrders";
import StepLibrary from "./pages/admin/StepLibrary";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/sign-in" element={<SignIn />} />

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
              <Orders />
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
        <Route
          path="/garments"
          element={
            <ProtectedRoute>
              <Garments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/garments/:garmentTypeId/steps"
          element={
            <ProtectedRoute>
              <Arrangement />
            </ProtectedRoute>
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
