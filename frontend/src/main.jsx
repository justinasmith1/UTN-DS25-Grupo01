import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import AuthProvider from "./app/providers/AuthProvider"
import ToastProvider from "./app/providers/ToastProvider.jsx";
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
          <App />
        <ToastProvider />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
