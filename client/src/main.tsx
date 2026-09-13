import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import App from "./catalog/app";
import "./catalog/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
