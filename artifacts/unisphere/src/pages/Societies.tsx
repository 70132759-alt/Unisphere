import { useState, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  useGetSocieties,
  joinSociety,
  leaveSociety,
  getGetSocietiesQueryKey,
} from "@workspace/api-client-react";

type SocietyWithOwner = {
  id: number;
  name: string;
  desc: string;
  icon: string;
  members: number;
  joined: boolean;
  isOwn?: boolean;
};

const bgColors = ["#ede9fe", "#d1fae5", "#fce7f3", "#dcfce7", "#dbeafe", "#fef3c7"];
const iconColors = ["#4f46e5", "#10b981", "#ec4899", "#16a34a", "#2563eb", "#d97706"];

const societyIcons = [
  { label: "General", value: "fas fa-users" },
  { label: "Technology", value: "fas fa-laptop-code" },
  { label: "Sports", value: "fas fa-football-ball" },
  { label: "Arts", value: "fas fa-palette" },
  { label: "Music", value: "fas fa-music" },
  { label: "Business", value: "fas fa-briefcase" },
  { label: "Science", value: "fas fa-flask" },
  { label: "Media", value: "fas fa-camera" },
];

function getSocietyCategory(icon: string) {
  if (icon.includes("laptop")) return "Technology";
  if (icon.includes("football")) return "Sports";
  if (icon.includes("palette")) return "Arts";
  if (icon.includes("music")) return "Music";
  if (icon.includes("briefcase")) return "Business";
  if (icon.includes("flask")) return "Science";
  if (icon.includes("camera")) return "Media";
  return "General";
}

export default function Societies() {
  const qc = useQueryClient();
  const { getToken } = useAuth();

  const { data: societiesData = [] } = useGetSocieties();
  const list: SocietyWithOwner[] = Array.isArray(societiesData) ? (societiesData as SocietyWithOwner[]) : [];

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "fas fa-users",
  });

  const selected = selectedId ? list.find((society) => society.id === selectedId) : null;

  const toggleJoin = async (id: number, joined: boolean) => {
    if (joined) await leaveSociety(id);
    else await joinSociety(id);

    qc.invalidateQueries({ queryKey: getGetSocietiesQueryKey() });
  };

  const deleteSociety = async (id: number) => {
    const confirmed = window.confirm("Delete this society?");
    if (!confirmed) return;

    const token = await getToken();

    const response = await fetch(`/api/societies/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      console.error("Could not delete society");
      return;
    }

    setSelectedId(null);
    qc.invalidateQueries({ queryKey: getGetSocietiesQueryKey() });
  };

  const createSociety = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter a society name.");
      return;
    }

    setCreating(true);

    try {
      const token = await getToken();

      const response = await fetch("/api/societies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          icon: form.icon,
        }),
      });

      if (!response.ok) {
        alert("Could not create society.");
        return;
      }

      setForm({
        name: "",
        description: "",
        icon: "fas fa-users",
      });

      setShowCreate(false);
      qc.invalidateQueries({ queryKey: getGetSocietiesQueryKey() });
    } finally {
      setCreating(false);
    }
  };

  const filtered = list.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Layout>
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
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Societies & Clubs</h2>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="map-search-wrap">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search societies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              <i className="fas fa-plus"></i> Create Society
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state">
          <i className="fas fa-users"></i>
          <p>No societies available</p>
        </div>
      )}

      <div className="societies-grid">
        {filtered.map((s, idx) => {
          const iconColor = iconColors[idx % iconColors.length];
          const iconBg = bgColors[idx % bgColors.length];

          return (
            <div
              key={s.id}
              className="society-card card"
              onClick={() => setSelectedId(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelectedId(s.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <div
                className="society-icon-wrap"
                style={{ background: iconBg }}
              >
                <i
                  className={s.icon}
                  style={{ fontSize: "32px", color: iconColor }}
                ></i>
              </div>

              <div className="society-body">
                <h4 className="society-name">{s.name}</h4>
                <p className="society-desc">{s.desc}</p>

                <div className="society-meta">
                  <span>
                    <i className="fas fa-users"></i> {s.members.toLocaleString()} members
                  </span>

                  {s.joined && (
                    <span className="society-member-tag">
                      <i className="fas fa-check-circle"></i> Member
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  {s.isOwn && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1, color: "var(--danger)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSociety(s.id);
                      }}
                    >
                      <i className="fas fa-trash-alt"></i> Delete
                    </button>
                  )}

                  <button
                    type="button"
                    className={`btn ${s.joined ? "btn-outline" : "btn-primary"}`}
                    style={{ flex: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleJoin(s.id, s.joined);
                    }}
                  >
                    {s.joined ? "Leave Society" : "Join Society"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <>
          <div className="app-modal-backdrop" onClick={() => setShowCreate(false)} />

          <div className="app-modal" role="dialog" aria-modal="true" aria-label="Create society">
            <div className="app-modal-header">
              <span>Create Society</span>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowCreate(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form className="app-modal-body" onSubmit={createSociety}>
              <label className="form-label">Society name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: Computer Science Society"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />

              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Describe the purpose of this society..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />

              <label className="form-label">Icon</label>
              <select
                className="form-input"
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
              >
                {societyIcons.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "14px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Society"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {selected && (
        <>
          <div className="app-modal-backdrop" onClick={() => setSelectedId(null)} />

          <div className="app-modal" role="dialog" aria-modal="true" aria-label={selected.name}>
            <div className="app-modal-header">
              <span>Society details</span>

              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedId(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="app-modal-body">
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  marginBottom: "18px",
                }}
              >
                <div
                  className="society-icon-wrap"
                  style={{
                    background: "#ede9fe",
                    width: "72px",
                    height: "72px",
                    flexShrink: 0,
                  }}
                >
                  <i
                    className={selected.icon}
                    style={{ fontSize: "34px", color: "#4f46e5" }}
                  ></i>
                </div>

                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 700 }}>{selected.name}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
                    {getSocietyCategory(selected.icon)} Society
                  </p>
                </div>
              </div>

              <div className="event-detail-meta" style={{ marginBottom: "16px" }}>
                <div className="event-detail-meta-row">
                  <i className="fas fa-users" style={{ color: "#4f46e5" }}></i>
                  <span>{selected.members.toLocaleString()} members</span>
                </div>

                <div className="event-detail-meta-row">
                  <i className="fas fa-layer-group" style={{ color: "#4f46e5" }}></i>
                  <span>{getSocietyCategory(selected.icon)} category</span>
                </div>

                <div className="event-detail-meta-row">
                  <i className="fas fa-user-shield" style={{ color: "#4f46e5" }}></i>
                  <span>Managed by Student Affairs</span>
                </div>

                <div className="event-detail-meta-row">
                  <i className={selected.joined ? "fas fa-check-circle" : "far fa-circle"} style={{ color: "#4f46e5" }}></i>
                  <span>{selected.joined ? "You are a member" : "You are not a member yet"}</span>
                </div>
              </div>

              <div className="event-detail-section">
                <h4>About this society</h4>
                <p>
                  {selected.desc ||
                    "This society helps students connect, collaborate, attend activities, and participate in campus life."}
                </p>
              </div>

              <button
                type="button"
                className={`btn ${selected.joined ? "btn-outline" : "btn-primary"}`}
                style={{ width: "100%", padding: "12px", marginTop: "18px" }}
                onClick={() => toggleJoin(selected.id, selected.joined)}
              >
                {selected.joined ? (
                  <>
                    <i className="fas fa-times"></i> Leave Society
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i> Join Society
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}