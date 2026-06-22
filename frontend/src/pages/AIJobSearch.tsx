import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

interface ProviderStatus {
  provider: string;
  mode: string;
  is_external_ai_configured: boolean;
  message: string;
}

interface MatchResult {
  company: string;
  position: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string[];
  improvements: string[];
  summary: string;
  cover_letter: string;
  provider: ProviderStatus;
}

const AIJobSearch = () => {
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  const fetchProviderStatus = async () => {
    try {
      const response = await api.get("/ai-jobs/provider");
      setProvider(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMatch = async () => {
    if (!position.trim() || !jobDescription.trim()) {
      toast.error("Add a position and job description first.");
      return;
    }

    setIsMatching(true);
    setResult(null);
    try {
      const response = await api.post("/ai-jobs/match", {
        company,
        position,
        job_description: jobDescription
      });
      setResult(response.data);
      toast.success("Job match analysis complete.");
    } catch (error) {
      console.error(error);
      toast.error("Upload a resume first, then run the match.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleSaveToTracker = async () => {
    if (!result) return;

    setIsSaving(true);
    try {
      await api.post("/jobs/", {
        company: result.company || "Unknown Company",
        position: result.position
      });
      toast.success("Saved to your job tracker.");
    } catch (error) {
      console.error(error);
      toast.error("Could not save this job.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ai-job-page">
      <div className="header-top">
        <div className="header-title-section">
          <h1>AI Job Search</h1>
          <p>Paste a role, compare it with your uploaded resume, and prepare the next application step.</p>
        </div>
        <div className={`status-badge ${provider?.is_external_ai_configured ? "" : "disconnected"}`}>
          <span className="status-dot"></span>
          {provider?.is_external_ai_configured ? provider.provider : "Free local mode"}
        </div>
      </div>

      <div className="ai-job-grid">
        <section className="glass ai-job-panel">
          <div className="pane-title">Role Details</div>

          <div className="ai-provider-note">
            {provider?.message || "Checking AI provider status..."}
          </div>

          <div className="form-group">
            <label className="form-label">Company</label>
            <input
              className="form-input"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Google, Zoho, TCS..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Position</label>
            <input
              className="form-input"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              placeholder="Frontend Developer"
            />
          </div>

          <div className="form-group ai-job-description">
            <label className="form-label">Job Description</label>
            <textarea
              className="form-input"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description, required skills, responsibilities, and qualifications..."
            />
          </div>

          <button className="btn btn-primary" onClick={handleMatch} disabled={isMatching}>
            {isMatching ? "Matching..." : "Match With Resume"}
          </button>
        </section>

        <section className="glass ai-job-panel">
          <div className="pane-title">Match Result</div>

          {!result ? (
            <div className="ai-empty-state">
              Add a job description and run matching to see score, missing skills, resume tips, and a cover letter draft.
            </div>
          ) : (
            <div className="ai-result-stack">
              <div className="analysis-results-grid">
                <div className="score-meter-container">
                  <div
                    className="radial-score"
                    style={{ "--score-percent": result.match_score } as React.CSSProperties}
                  >
                    <span className="score-text">{result.match_score}%</span>
                  </div>
                  <span className="radial-label">Resume Fit</span>
                </div>

                <div className="analysis-details">
                  <div className="ai-result-summary">{result.summary}</div>

                  <div>
                    <span className="form-label">Matched Skills</span>
                    <div className="analysis-pills">
                      {result.matched_skills.length ? (
                        result.matched_skills.map((skill) => (
                          <span key={skill} className="pill pill-matched">{skill}</span>
                        ))
                      ) : (
                        <span className="ai-muted">No direct skill matches found.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="form-label">Missing Skills</span>
                    <div className="analysis-pills">
                      {result.missing_skills.length ? (
                        result.missing_skills.map((skill) => (
                          <span key={skill} className="pill pill-missing">{skill}</span>
                        ))
                      ) : (
                        <span className="ai-muted">No major missing skills detected.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <span className="form-label">Resume Improvements</span>
                <ul className="bullet-list">
                  {result.improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="form-label">Cover Letter Draft</span>
                <pre className="cover-letter-box">{result.cover_letter}</pre>
              </div>

              <button className="btn btn-secondary" onClick={handleSaveToTracker} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save To Tracker"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AIJobSearch;
