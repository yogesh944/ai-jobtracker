import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import toast from "react-hot-toast";

interface DashboardStats {
  total_jobs: number;
  applied: number;
  interview: number;
  rejected: number;
  offer: number;
}

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/dashboard");
      setStats(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard statistics.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading dashboard stats...</div>
      </div>
    );
  }

  const barData = [
    { name: "Applied", value: stats.applied, color: "#9b5cff" },
    { name: "Interview", value: stats.interview, color: "#b78cff" },
    { name: "Offer", value: stats.offer, color: "#ffffff" },
    { name: "Rejected", value: stats.rejected, color: "#6f35dd" }
  ];

  const pieData = barData.filter(d => d.value > 0);

  return (
    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="header-top">
        <div className="header-title-section">
          <h1>Welcome back, {user?.name || "User"}!</h1>
          <p>Here is your current career transition status and AI recommendations.</p>
        </div>
        <div className="status-badge">
          <span className="status-dot"></span>
          Live Sync Enabled
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="dashboard-grid">
        <div className="stat-card glass" style={{ "--glow-color": "#9b5cff" } as React.CSSProperties}>
          <div className="stat-info">
            <span className="stat-label">Total Applications</span>
            <span className="stat-value">{stats.total_jobs}</span>
          </div>
          <div className="stat-icon-box" style={{ background: "rgba(155, 92, 255, 0.14)", color: "#c8a7ff" }}>
            All
          </div>
          <div className="stat-glow"></div>
        </div>

        <div className="stat-card glass" style={{ "--glow-color": "#9b5cff" } as React.CSSProperties}>
          <div className="stat-info">
            <span className="stat-label">Applied</span>
            <span className="stat-value">{stats.applied}</span>
          </div>
          <div className="stat-icon-box" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#ffffff" }}>
            App
          </div>
          <div className="stat-glow"></div>
        </div>

        <div className="stat-card glass" style={{ "--glow-color": "#b78cff" } as React.CSSProperties}>
          <div className="stat-info">
            <span className="stat-label">Interviews</span>
            <span className="stat-value">{stats.interview}</span>
          </div>
          <div className="stat-icon-box" style={{ background: "rgba(183, 140, 255, 0.14)", color: "#c8a7ff" }}>
            Int
          </div>
          <div className="stat-glow"></div>
        </div>

        <div className="stat-card glass" style={{ "--glow-color": "#ffffff" } as React.CSSProperties}>
          <div className="stat-info">
            <span className="stat-label">Offers Received</span>
            <span className="stat-value">{stats.offer}</span>
          </div>
          <div className="stat-icon-box" style={{ background: "rgba(255, 255, 255, 0.12)", color: "#ffffff" }}>
            Win
          </div>
          <div className="stat-glow"></div>
        </div>
      </div>

      {/* Visual Analytics Graphs */}
      <div className="charts-section">
        <div className="chart-card glass">
          <span className="chart-title">Application Funnel Distribution</span>
          <div style={{ width: "100%", height: 260 }}>
            {stats.total_jobs === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                No job data available. Add job applications to see analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#08060d", border: "1px solid rgba(155,92,255,0.28)", borderRadius: "8px" }}
                    labelStyle={{ color: "var(--text-title)", fontWeight: 600 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card glass">
          <span className="chart-title">Status Breakdown</span>
          <div style={{ width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {pieData.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No distribution data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ background: "#08060d", border: "1px solid rgba(155,92,255,0.28)", borderRadius: "8px" }}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {pieData.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", fontSize: "0.75rem" }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color }}></span>
                  <span style={{ color: "var(--text-main)" }}>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Quick Insights Banner */}
      <div className="glass" style={{ padding: "24px" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "var(--text-title)", display: "flex", alignItems: "center", gap: "8px" }}>
          AI Career Insights
        </h3>
        <p style={{ color: "var(--text-main)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          {stats.total_jobs === 0 ? (
            "Ready to kick off your job search? Upload your resume in the 'Resume & AI Match' tab to extract your technical skills and match them against jobs. Then build out your applications in the Job Tracker board!"
          ) : stats.interview > 0 ? (
            "Congratulations on securing interviews! Take advantage of our 'AI Interview Prep' module to practice custom generated questions and mock responses based on frontend/backend target roles."
          ) : stats.applied > 5 ? (
            "You have several pending job applications. While you wait for follow-up responses, we recommend keeping your resume profile parsed and running the AI Resume Analyzer against prospective descriptions to maximize score alignments."
          ) : (
            "Keep growing your application queue! Add more entries to your tracker. For each targeted position, customize details to maintain structured follow-ups."
          )}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
