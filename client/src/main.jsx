
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import{BrowserRouter}from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext.jsx'
import { ChatProvider } from '../context/ChatContext.jsx'
import { VoiceProvider } from '../context/VoiceContext.jsx'

// Initialize user saved theme
const savedTheme = localStorage.getItem("gameconnect_theme") || "default";
document.documentElement.setAttribute("data-theme", savedTheme);

// Register PWA Service Worker
if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration notice:", err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ChatProvider>
        <VoiceProvider>
          <App />
        </VoiceProvider>
      </ChatProvider>
    </AuthProvider>
  </BrowserRouter>,
)

