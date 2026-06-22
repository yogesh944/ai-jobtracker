import { useState } from "react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

const Login = () => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const authLogin = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.access_token) {
        await authLogin(response.data.access_token);
        toast.success("Welcome back!");
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || "Invalid email or password.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      toast.error("Please fill in all registration fields.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", { name, email, password });
      if (response.data.message === "User created successfully") {
        toast.success("Account created successfully! Please log in.");
        setName("");
        // Switch to login tab automatically
        setActiveTab("login");
      } else {
        toast.error(response.data.message || "Registration failed.");
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || "Email already registered or invalid inputs.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div className="logo-icon" style={{ margin: "0 auto 16px auto", width: "48px", height: "48px" }}>
            AI
            <div className="logo-pulse"></div>
          </div>
          <h2 style={{ margin: 0, color: "var(--text-title)", fontWeight: 700 }}>AI Job Tracker</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Optimize your job search pipeline
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
            disabled={isLoading}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
            disabled={isLoading}
          >
            Sign Up
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {activeTab === "register" && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  activeTab === "login" ? handleLogin() : handleRegister();
                }
              }}
            />
          </div>

          <button
            className="btn btn-primary auth-btn-submit"
            onClick={activeTab === "login" ? handleLogin : handleRegister}
            disabled={isLoading}
          >
            {isLoading
              ? "Please wait..."
              : activeTab === "login"
              ? "Sign In to Dashboard"
              : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;