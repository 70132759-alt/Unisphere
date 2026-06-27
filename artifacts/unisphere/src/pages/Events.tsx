import { useState, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  useGetEvents,
  rsvpEvent,
  unrsvpEvent,
  getGetEventsQueryKey,
} from "@workspace/api-client-react";
import type { Event } from "@workspace/api-client-react";

const categoryColors: Record<string, string> = {
  All: "#4f46e5",
  General: "#64748b",
  Career: "#4f46e5",
  Tech: "#10b981",
  Sports: "#f59e0b",
  Culture: "#ec4899",
};

const categoryOrganizer: Record<string, string> = {
  General: "Student Affairs Office",
  Career: "Career Services Office",
  Tech: "Tech & Innovation Society",
  Sports: "Sports & Recreation Office",
  Culture: "Arts & Culture Society",
};

const categoryDescription: Record<string, string> = {
  General: "Join fellow students for this campus event. Tap RSVP to save your spot and stay updated.",
  Career:
    "Meet recruiters, explore graduate opportunities, and get hands-on advice to launch your career. Bring copies of your CV and dress to impress.",
  Tech:
    "A deep-dive session for builders and the tech-curious — talks, live demos, and Q&A with people working at the cutting edge of the field.",
  Sports:
    "Get active and represent your university. All skill levels welcome — come to compete or simply cheer on your friends and teammates.",
  Culture:
    "A celebration of creativity and campus culture. Expect exhibits, performances, and a warm, welcoming crowd of fellow students.",
};

const categories = ["All", "General", "Career", "Tech", "Sports", "Culture"];
const formCategories = ["General", "Career", "Tech", "Sports", "Culture"];

function splitDate(date: string) {
  const idx = date.indexOf(",");
  if (idx === -1) return { day: date.trim(), time: "" };
  return { day: date.slice(0, idx).trim(), time: date.slice(idx + 1).trim() };
}

function formatEventDate(date: string, time: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-").map(Number);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const prettyDay = `${monthNames[(month || 1) - 1]} ${day || 1}`;

  if (!time) return prettyDay;

  const [rawHour, rawMinute] = time.split(":").map(Number);
  const suffix = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  const minute = String(rawMinute || 0).padStart(2, "0");

  return `${prettyDay}, ${hour}:${minute} ${suffix}`;
}

export default function Events() {
  const qc = useQueryClient();
  const { getToken } = useAuth();

  const { data: eventsData } = useGetEvents();
  const events = Array.isArray(eventsData) ? eventsData : [];

  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Event | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    category: "General",
    image: "",
  });

  const toggleRsvp = async (ev: Event) => {
    if (ev.rsvp) await unrsvpEvent(ev.id);
    else await rsvpEvent(ev.id);

    qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });

    setSelected((prev) =>
      prev && prev.id === ev.id
        ? {
            ...prev,
            rsvp: !ev.rsvp,
            attendees: Math.max(0, prev.attendees + (ev.rsvp ? -1 : 1)),
          }
        : prev,
    );
  };

  const createEvent = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter an event name.");
      return;
    }

    if (!form.date) {
      alert("Please select an event date.");
      return;
    }

    if (!form.location.trim()) {
      alert("Please enter an event location.");
      return;
    }

    setCreating(true);

    try {
      const token = await getToken();

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          date: formatEventDate(form.date, form.time),
          location: form.location.trim(),
          category: form.category,
          image: form.image.trim(),
        }),
      });

      if (!response.ok) {
        alert("Could not create event.");
        return;
      }

      setForm({
        name: "",
        date: "",
        time: "",
        location: "",
        category: "General",
        image: "",
      });

      setShowCreate(false);
      qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
    } finally {
      setCreating(false);
    }
  };

  const filtered = filter === "All" ? events : events.filter((e) => e.category === filter);

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
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Upcoming Events</h2>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="filter-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`filter-tab ${filter === cat ? "active" : ""}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <i className="fas fa-plus"></i> Create Event
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state">
          <i className="far fa-calendar"></i>
          <p>No events available</p>
        </div>
      )}

      <div className="events-grid">
        {filtered.map((e) => {
          const color = categoryColors[e.category] || "#4f46e5";
          const { day, time } = splitDate(e.date);

          return (
            <div
              key={e.id}
              className="event-card card event-card-clickable"
              onClick={() => setSelected(e)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") setSelected(e);
              }}
            >
              <div className="event-img-wrap">
                <img src={e.image} alt={e.name} className="event-img" />
                <span className="event-category-badge" style={{ background: color }}>
                  {e.category}
                </span>
              </div>

              <div className="event-body">
                <div className="event-date-badge">
                  <span className="event-day">{day.split(" ").slice(0, 2).join(" ")}</span>
                  <span className="event-time">{time}</span>
                </div>

                <div className="event-info">
                  <h4 className="event-title">{e.name}</h4>
                  <p className="event-location">
                    <i className="fas fa-map-marker-alt"></i> {e.location}
                  </p>

                  <div className="event-attendees">
                    <span>
                      <i className="fas fa-users" style={{ color }}></i>{" "}
                      {e.attendees.toLocaleString()} going
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`btn ${e.rsvp ? "btn-outline" : "btn-primary"}`}
                    style={{ width: "100%", marginTop: "12px" }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleRsvp(e);
                    }}
                  >
                    {e.rsvp ? (
                      <>
                        <i className="fas fa-check"></i> Going!
                      </>
                    ) : (
                      <>
                        <i className="far fa-calendar-plus"></i> RSVP
                      </>
                    )}
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

          <div className="app-modal" role="dialog" aria-modal="true" aria-label="Create event">
            <div className="app-modal-header">
              <span>Create Event</span>

              <button type="button" className="icon-btn" onClick={() => setShowCreate(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form className="app-modal-body" onSubmit={createEvent}>
              <label className="form-label">Event name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: Tech Talk 2026"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />

              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />

              <label className="form-label">Time</label>
              <input
                className="form-input"
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              />

              <label className="form-label">Location</label>
              <input
                className="form-input"
                type="text"
                placeholder="Example: Main Auditorium"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              />

              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                {formCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <label className="form-label">Image URL optional</label>
              <input
                className="form-input"
                type="url"
                placeholder="Leave empty to use default event image"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
              />

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "14px",
                }}
              >
                <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {selected &&
        (() => {
          const color = categoryColors[selected.category] || "#4f46e5";
          const { day, time } = splitDate(selected.date);
          const organizer = categoryOrganizer[selected.category] || "Student Union";
          const description =
            categoryDescription[selected.category] ||
            "Join fellow students for this campus event. Tap RSVP to save your spot and get reminders.";

          return (
            <>
              <div className="app-modal-backdrop" onClick={() => setSelected(null)} />

              <div
                className="app-modal event-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-label={selected.name}
              >
                <div className="event-detail-hero">
                  <img src={selected.image} alt={selected.name} />
                  <span className="event-category-badge" style={{ background: color }}>
                    {selected.category}
                  </span>

                  <button
                    type="button"
                    className="event-detail-close"
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                  >
                    <i className="fas fa-times"></i>
                  </button>

                  {selected.rsvp && (
                    <span className="event-detail-status">
                      <i className="fas fa-check-circle"></i> You're going
                    </span>
                  )}
                </div>

                <div className="event-detail-body">
                  <h3 className="event-detail-title">{selected.name}</h3>

                  <div className="event-detail-meta">
                    <div className="event-detail-meta-row">
                      <i className="far fa-calendar" style={{ color }}></i>
                      <span>{day || "Date to be announced"}</span>
                    </div>

                    {time && (
                      <div className="event-detail-meta-row">
                        <i className="far fa-clock" style={{ color }}></i>
                        <span>{time}</span>
                      </div>
                    )}

                    <div className="event-detail-meta-row">
                      <i className="fas fa-map-marker-alt" style={{ color }}></i>
                      <span>{selected.location}</span>
                    </div>

                    <div className="event-detail-meta-row">
                      <i className="fas fa-user-tie" style={{ color }}></i>
                      <span>Organized by {organizer}</span>
                    </div>

                    <div className="event-detail-meta-row">
                      <i className="fas fa-users" style={{ color }}></i>
                      <span>{selected.attendees.toLocaleString()} attending</span>
                    </div>
                  </div>

                  <div className="event-detail-section">
                    <h4>About this event</h4>
                    <p>{description}</p>
                  </div>

                  <button
                    type="button"
                    className={`btn ${selected.rsvp ? "btn-outline" : "btn-primary"}`}
                    style={{ width: "100%", padding: "12px" }}
                    onClick={() => toggleRsvp(selected)}
                  >
                    {selected.rsvp ? (
                      <>
                        <i className="fas fa-times"></i> Cancel RSVP
                      </>
                    ) : (
                      <>
                        <i className="far fa-calendar-plus"></i> Register / RSVP
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          );
        })()}
    </Layout>
  );
}