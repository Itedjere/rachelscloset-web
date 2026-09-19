import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthProvider.tsx";
import { bootstrapTheme } from "./lib/theme.ts";
import "./styles/app.css";

// Stamp data-theme before the first paint so there is no flash of the wrong theme.
bootstrapTheme();

const container = document.getElementById("root");

if (!container) throw new Error("Root element #root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
