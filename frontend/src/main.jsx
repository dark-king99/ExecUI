import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App/App";
import "./styles/App.css";

if (import.meta.env.VITE_USE_MOCK === 'true') {
  const { installMockFetch } = await import('./services/mockFetch.js');
  installMockFetch();
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
