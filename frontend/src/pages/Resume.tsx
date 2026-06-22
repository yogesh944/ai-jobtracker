import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

interface ProjectSuggestion {
  title: string;
  description: string;
}

interface AnalysisResults {
  match_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  strengths: string[];
  improvements: string[];
  suggested_projects: ProjectSuggestion[];
}

const Resume = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisResults | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCurrentResume();
  }, []);

  const fetchCurrentResume = async () => {
    try {
      const response = await api.get("/resume/current");
      if (response.data.filename) {
        setFileName(response.data.filename);
        setExtractedText(response.data.text || "");
      }
    } catch (error) {
      console.error("Failed to fetch current resume details:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file only.");
        return;
      }
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (fileToUpload: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const response = await api.post("/resume/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Resume uploaded and parsed successfully!");
      setFileName(response.data.filename);
      setExtractedText(response.data.text || "");
      setAnalysis(null); // Clear previous analysis
    } catch (error) {
      console.error(error);
      toast.error("Failed to parse and upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!extractedText) {
      toast.error("Please upload a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please paste a target job description to match against.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await api.post("/resume/analyze", {
        job_description: jobDescription
      });
      setAnalysis(response.data);
      toast.success("Resume matching analysis complete!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze resume against job description.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="header-top">
        <div className="header-title-section">
          <h1>Resume Parser & AI Matcher</h1>
          <p>Extract technical text from your resume and measure match alignment against custom target roles.</p>
        </div>
      </div>

      <div className="resume-layout">
        {/* Left Side: Upload & Parse Inspector */}
        <div className="glass resume-pane">
          <span className="pane-title">1. Document Parsing</span>
          
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div
            className="upload-card glass"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">PDF</div>
            <div className="upload-title">
              {isUploading ? "Uploading & Analyzing..." : fileName ? `Active: ${fileName}` : "Upload Resume PDF"}
            </div>
            <div className="upload-subtitle">
              {fileName ? "Click to upload a different PDF" : "Supports standard PDF documents"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
            <span className="form-label">Extracted Plain Text Inspector</span>
            <div className="text-inspector">
              {extractedText ? (
                extractedText
              ) : (
                <div className="text-placeholder">
                  No resume content parsed yet. Upload your PDF file above to review extracted text.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Target Job & Match Analyzer */}
        <div className="glass resume-pane">
          <span className="pane-title">2. AI Fitment & Alignment</span>
          
          <div className="form-group" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
            <label className="form-label">Target Job Description</label>
            <textarea
              className="form-input"
              placeholder="Paste the target job description details here (roles, duties, tech requirements)..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{ flexGrow: 1, minHeight: "150px", resize: "none" }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !extractedText || !jobDescription.trim()}
            style={{ width: "100%" }}
          >
            {isAnalyzing ? "Analyzing Fitment..." : "Match Resume Against Job"}
          </button>

          {analysis && (
            <div className="glass ai-analyzer-panel" style={{ padding: "20px", marginTop: "12px" }}>
              <div className="analysis-results-grid">
                <div className="score-meter-container">
                  <div
                    className="radial-score"
                    style={{ "--score-percent": analysis.match_score } as React.CSSProperties}
                  >
                    <span className="score-text">{analysis.match_score}%</span>
                  </div>
                  <span className="radial-label">Match Score</span>
                </div>

                <div className="analysis-details">
                  <div>
                    <span className="form-label" style={{ fontSize: "0.75rem" }}>Matched Keywords</span>
                    <div className="analysis-pills">
                      {analysis.matched_keywords.length === 0 ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>None detected</span>
                      ) : (
                        analysis.matched_keywords.map((kw, i) => (
                          <span key={i} className="pill pill-matched">{kw}</span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="form-label" style={{ fontSize: "0.75rem" }}>Missing Keywords</span>
                    <div className="analysis-pills">
                      {analysis.missing_keywords.length === 0 ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>None detected</span>
                      ) : (
                        analysis.missing_keywords.map((kw, i) => (
                          <span key={i} className="pill pill-missing">{kw}</span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "8px" }}>
                <span className="form-label" style={{ fontSize: "0.75rem" }}>Key Strengths</span>
                <ul className="bullet-list">
                  {analysis.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="form-label" style={{ fontSize: "0.75rem" }}>Suggested Project Bridge</span>
                {analysis.suggested_projects.map((proj, i) => (
                  <div key={i} className="project-card">
                    <div className="project-title">{proj.title}</div>
                    <div className="project-desc">{proj.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Resume;
