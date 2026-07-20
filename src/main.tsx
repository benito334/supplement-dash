import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useStore } from "./store";
import { useSync } from "./cloud";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "./styles.css";

if (import.meta.env.DEV) {
  // Console-debugging only — never included in the production build.
  (window as unknown as Record<string, unknown>).__store = useStore;
  (window as unknown as Record<string, unknown>).__sync = useSync;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
