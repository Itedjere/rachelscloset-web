import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AlertSettings from "./pages/AlertSettings";
import Home from "./pages/Home";
import Notifications from "./pages/Notifications";
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
