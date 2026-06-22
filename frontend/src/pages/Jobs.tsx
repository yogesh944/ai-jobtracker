import { useEffect, useState } from "react";
import api from "../services/api";
import type { Job } from "../types/job";
import toast from "react-hot-toast";

const COLUMNS = ["Applied", "Interview", "Offer", "Rejected"];
const COLUMN_INDICATORS: Record<string, string> = {
  Applied: "#9b5cff",
  Interview: "#b78cff",
  Offer: "#ffffff",
  Rejected: "#6f35dd"
};

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  
  // Fields for adding new job
  const [company, setCompany] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [status, setStatus] = useState<string>("Applied");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/jobs");
      setJobs(response.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load your jobs.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!company.trim() || !position.trim()) {
      toast.error("Please fill in both company and position fields.");
      return;
    }

    try {
      const response = await api.post("/jobs/", {
        company,
        position,
        status
      });
      // Response includes the new job object, let's fetch list again
      toast.success(response.data.message || "Job added successfully!");
      setIsAddModalOpen(false);
      setCompany("");
      setPosition("");
      setStatus("Applied");
      fetchJobs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create job application.");
    }
  };

  const handleMoveStatus = async (jobId: number, currentStatus: string) => {
    // Find next status in rotation
    const currentIndex = COLUMNS.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % COLUMNS.length;
    const nextStatus = COLUMNS[nextIndex];

    try {
      await api.put(`/jobs/${jobId}`, {
        status: nextStatus
      });
      toast.success(`Moved to ${nextStatus}`);
      fetchJobs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this job application?");
    if (!confirmDelete) return;

    try {
      const response = await api.delete(`/jobs/${jobId}`);
      toast.success(response.data.message || "Job deleted successfully.");
      fetchJobs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete job.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading job tracker board...</div>
      </div>
    );
  }

  return (
    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="header-top">
        <div className="header-title-section">
          <h1>My Job Tracker</h1>
          <p>Organize, track, and advance your active job applications in real time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          Add Application
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="kanban-board">
        {COLUMNS.map((colName) => {
          const colJobs = jobs.filter((j) => j.status === colName);
          const colIndicatorColor = COLUMN_INDICATORS[colName];

          return (
            <div key={colName} className="kanban-column">
              <div className="column-header">
                <span className="column-title">
                  <span
                    className="column-indicator"
                    style={{ background: colIndicatorColor, boxShadow: `0 0 8px ${colIndicatorColor}` }}
                  ></span>
                  {colName}
                </span>
                <span className="column-count">{colJobs.length}</span>
              </div>

              <div className="kanban-cards">
                {colJobs.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "120px",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      border: "1px dashed rgba(255,255,255,0.12)",
                      borderRadius: "8px"
                    }}
                  >
                    No jobs here
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div key={job.id} className="kanban-card glass">
                      <div className="card-top">
                        <div>
                          <span className="job-company">{job.company}</span>
                          <div className="job-position">{job.position}</div>
                        </div>
                      </div>
                      <div className="card-actions">
                        <button
                          className="card-btn move"
                          onClick={() => handleMoveStatus(job.id, job.status)}
                          title="Advance Status"
                        >
                          Move
                        </button>
                        <button
                          className="card-btn delete"
                          onClick={() => handleDeleteJob(job.id)}
                          title="Delete Application"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Job Modal Dialog */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <h3 className="modal-title">Track New Application</h3>
            
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Google, Stripe, etc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Job Title / Position</label>
              <input
                type="text"
                className="form-input"
                placeholder="Senior Full Stack Engineer"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pipeline Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ background: "#08060d" }}
              >
                {COLUMNS.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateJob}>
                Add Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
