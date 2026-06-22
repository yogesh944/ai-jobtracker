import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Resume from "./pages/Resume";
import Interview from "./pages/Interview";
import AIJobSearch from "./pages/AIJobSearch";

// Private Layout Component with Sidebar & WebSocket Toast Notifications
const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Establish WebSocket Connection for Real-Time Alerts
    const wsUrl = `ws://127.0.0.1:8000/ws/${user.id}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected. Subscribed for user notifications.");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          toast(data.message, {
            icon: '•',
            style: {
              background: 'rgba(10, 7, 15, 0.9)',
              color: '#ffffff',
              border: '1px solid rgba(155, 92, 255, 0.4)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
            },
            duration: 5000,
          });
        }
      } catch (e) {
        console.error("Error reading websocket frame:", e);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    return () => {
      socket.close();
    };
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Get initials for profile badge
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand-section">
          <div className="logo-icon">
            Ai
            <div className="logo-pulse"></div>
          </div>
          <span className="brand-name">Jobify</span>
        </div>

        <nav className="nav-links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-mark">01</span>
            Dashboard
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-mark">02</span>
            Job Tracker
          </NavLink>
          <NavLink
            to="/resume"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-mark">03</span>
            Resume & AI Match
          </NavLink>
          <NavLink
            to="/interview"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-mark">04</span>
            AI Interview Prep
          </NavLink>
          <NavLink
            to="/ai-jobs"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-mark">05</span>
            AI Job Search
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-viewport">
        {children}
      </main>
    </div>
  );
};

// Route Guard to redirect authenticated users away from Login
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#050407",
        color: "rgba(255,255,255,0.78)"
      }}>
        <div className="logo-icon" style={{ width: "60px", height: "60px", fontSize: "1.75rem", marginBottom: "20px" }}>
          AI
          <div className="logo-pulse"></div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.52)", fontSize: "0.9rem" }}>Loading your workspace...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public auth route */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected workspace routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateLayout>
              <Dashboard />
            </PrivateLayout>
          }
        />
        <Route
          path="/jobs"
          element={
            <PrivateLayout>
              <Jobs />
            </PrivateLayout>
          }
        />
        <Route
          path="/resume"
          element={
            <PrivateLayout>
              <Resume />
            </PrivateLayout>
          }
        />
        <Route
          path="/interview"
          element={
            <PrivateLayout>
              <Interview />
            </PrivateLayout>
          }
        />
        <Route
          path="/ai-jobs"
          element={
            <PrivateLayout>
              <AIJobSearch />
            </PrivateLayout>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
