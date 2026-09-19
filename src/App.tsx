import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AlertSettings from "./pages/AlertSettings";
import Home from "./pages/Home";
import Arrangement from "./pages/Arrangement";
import Garments from "./pages/Garments";
import Notifications from "./pages/Notifications";
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
          path="/admin/steps"
          element={
            <RoleRoute allow={["admin"]}>
              <StepLibrary />
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
