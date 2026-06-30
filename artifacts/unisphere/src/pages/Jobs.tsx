import { useState, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  useGetJobs,
  saveJob,
  unsaveJob,
  applyJob,
  withdrawJobApplication,
  getGetJobsQueryKey,
} from "@workspace/api-client-react";
import type { Job } from "@workspace/api-client-react";

type JobWithOwner = Job & { isOwn?: boolean };

export default function Jobs() {
  const qc = useQueryClient();
  const { getToken } = useAuth();

  const { data: jobsData } = useGetJobs();
  const jobs: JobWithOwner[] = Array.isArray(jobsData) ? (jobsData as JobWithOwner[]) : [];
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [details, setDetails] = useState<Job | null>(null);
  const [showPostJob, setShowPostJob] = useState(false);
  const [posting, setPosting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "Internship",
    salary: "",
    tags: "",
    logo: "",
  });

  const typeColors: Record<string, string> = {
    "Full-time": "#4f46e5",
    Internship: "#10b981",
    Graduate: "#f59e0b",
  };

  const types = ["All", "Full-time", "Internship", "Graduate"];
  const formTypes = ["Full-time", "Internship", "Graduate"];

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const toggleApply = async (id: number, title: string, applied: boolean) => {
    if (applied) {
      await withdrawJobApplication(id);
      showToast(`Application withdrawn for "${title}".`);
    } else {
      await applyJob(id);
      showToast(`Application sent for "${title}".`);
    }

    qc.invalidateQueries({ queryKey: getGetJobsQueryKey() });
  };

  const toggleSave = async (id: number, saved: boolean) => {
    if (saved) await unsaveJob(id);
    else await saveJob(id);

    qc.invalidateQueries({ queryKey: getGetJobsQueryKey() });
  };

  const deleteJob = async (id: number) => {
    const confirmed = window.confirm("Delete this job post?");
    if (!confirmed) return;

    const token = await getToken();

    const response = await fetch(`/api/jobs/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      setToast("Could not delete job");
      return;
    }

    qc.invalidateQueries({ queryKey: getGetJobsQueryKey() });
    setToast("Job deleted");
  };

  const createJob = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a job title.");
      return;
    }

    if (!form.company.trim()) {
      alert("Please enter a company name.");
      return;
    }

    if (!form.location.trim()) {
      alert("Please enter a location.");
      return;
    }

    setPosting(true);

    try {
      const token = await getToken();

      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: form.title.trim(),
          company: form.company.trim(),
          location: form.location.trim(),
          type: form.type,
          salary: form.salary.trim(),
          tags,
          logo: form.logo.trim(),
        }),
      });

      if (!response.ok) {
        alert("Could not post job.");
        return;
      }

      setForm({
        title: "",
        company: "",
        location: "",
        type: "Internship",
        salary: "",
        tags: "",
        logo: "",
      });

      setShowPostJob(false);
      qc.invalidateQueries({ queryKey: getGetJobsQueryKey() });
      showToast("Job posted successfully!");
    } finally {
      setPosting(false);
    }
  };

  const filtered = filter === "All" ? jobs : jobs.filter((job) => job.type === filter);

  return (
    <Layout>
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <i className="fas fa-user-shield" style={{ color: "var(--accent-html)", marginTop: "3px" }}></i>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>Verified Opportunity Submission</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              In this prototype, verified UOL users can submit jobs and internships. In the production version, official opportunity approval will be handled by Faculty/Admin roles.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast-notification">
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}

      <div className="card" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Jobs & Internships</h2>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="filter-tabs">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`filter-tab ${filter === type ? "active" : ""}`}
                  onClick={() => setFilter(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <button type="button" className="btn btn-primary" onClick={() => setShowPostJob(true)}>
              <i className="fas fa-plus"></i> Post Job
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state">
          <i className="fas fa-briefcase"></i>
          <p>No jobs posted yet</p>
        </div>
      )}

      {filtered.map((job) => (
        <div key={job.id} className="card job-card-new">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "16px", flex: 1 }}>
              <img src={job.logo} className="company-logo" alt={job.company} />

              <div className="job-details" style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
                    {job.title}
                  </h4>

                  {job.isOwn && (
                    <button
                      type="button"
                      className="save-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteJob(job.id);
                      }}
                      title="Delete job"
                      style={{ color: "var(--danger)" }}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`save-btn ${job.saved ? "saved" : ""}`}
                    onClick={() => toggleSave(job.id, job.saved)}
                    title={job.saved ? "Unsave" : "Save"}
                  >
                    <i className={job.saved ? "fas fa-bookmark" : "far fa-bookmark"}></i>
                  </button>
                </div>

                <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "6px" }}>
                  {job.company} · <i className="fas fa-map-marker-alt"></i> {job.location}
                </p>

                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--accent-html)",
                    marginBottom: "10px",
                  }}
                >
                  <i className="fas fa-money-bill-wave"></i>{" "}
                  {job.salary || "Salary not specified"}
                </p>

                <div className="job-tags">
                  <span
                    className="tag"
                    style={{
                      background: `${typeColors[job.type] || "#4f46e5"}18`,
                      color: typeColors[job.type] || "#4f46e5",
                    }}
                  >
                    {job.type}
                  </span>

                  {job.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border-html)",
            }}
          >
            <button
              type="button"
              className={`btn ${job.applied ? "btn-outline" : "btn-primary"}`}
              style={{ flex: 1 }}
              onClick={() => toggleApply(job.id, job.title, Boolean(job.applied))}
            >
              {job.applied ? (
                <>
                  <i className="fas fa-check"></i> Applied
                </>
              ) : (
                "Apply Now"
              )}
            </button>

            <button type="button" className="btn btn-outline" onClick={() => setDetails(job)}>
              <i className="fas fa-external-link-alt"></i> Details
            </button>
          </div>
        </div>
      ))}

      {showPostJob && (
        <>
          <div className="app-modal-backdrop" onClick={() => setShowPostJob(false)} />

          <div className="app-modal" role="dialog" aria-modal="true" aria-label="Post job">
            <div className="app-modal-header">
              <span>Post Job</span>

              <button type="button" className="icon-btn" onClick={() => setShowPostJob(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form className="app-modal-body" onSubmit={createJob}>
              <label className="form-label">Job title</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: Frontend Developer Intern"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />

              <label className="form-label">Company</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: TechSoft"
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              />

              <label className="form-label">Location</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: Lahore / Remote"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />

              <label className="form-label">Job type</label>
              <select
                className="form-input"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {formTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <label className="form-label">Salary / stipend</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: PKR 40,000/month"
                value={form.salary}
                onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
              />

              <label className="form-label">Tags comma separated</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: React, TypeScript, Remote"
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              />

              <label className="form-label">Company logo URL optional</label>
              <input
                className="form-input"
                type="url"
                placeholder="Leave empty to auto-generate logo"
                value={form.logo}
                onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.value }))}
              />

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "14px",
                }}
              >
                <button type="button" className="btn btn-outline" onClick={() => setShowPostJob(false)}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={posting}>
                  {posting ? "Posting..." : "Post Job"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {details && (
        <>
          <div className="app-modal-backdrop" onClick={() => setDetails(null)} />

          <div className="app-modal">
            <div className="app-modal-header">
              <span>Job details</span>

              <button type="button" className="icon-btn" onClick={() => setDetails(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="app-modal-body">
              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "16px" }}>
                <img src={details.logo} className="company-logo" alt={details.company} />

                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{details.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{details.company}</p>
                </div>
              </div>

              <div className="job-detail-grid">
                <div>
                  <i className="fas fa-map-marker-alt"></i> {details.location}
                </div>

                <div>
                  <i className="fas fa-money-bill-wave"></i>{" "}
                  {details.salary || "Salary not specified"}
                </div>

                <div>
                  <i className="fas fa-briefcase"></i> {details.type}
                </div>
              </div>

              <div className="job-tags" style={{ marginTop: "14px" }}>
                {details.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              <p
                style={{
                  marginTop: "16px",
                  lineHeight: 1.6,
                  fontSize: "14px",
                  color: "var(--text-muted)",
                }}
              >
                {details.company} is looking for a {details.title}. This{" "}
                {details.type.toLowerCase()} role is based in {details.location}. Apply now to
                join the team and grow your career.
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  className={`btn ${details.applied ? "btn-outline" : "btn-primary"}`}
                  style={{ flex: 1 }}
                  onClick={() => {
                    void toggleApply(details.id, details.title, Boolean(details.applied));
                    setDetails(null);
                  }}
                >
                  {details.applied ? (
                    <>
                      <i className="fas fa-check"></i> Applied
                    </>
                  ) : (
                    "Apply Now"
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => toggleSave(details.id, details.saved)}
                >
                  <i className={details.saved ? "fas fa-bookmark" : "far fa-bookmark"}></i>{" "}
                  {details.saved ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}


