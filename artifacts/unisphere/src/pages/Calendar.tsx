import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  useGetEvents,
  rsvpEvent,
  unrsvpEvent,
  getGetEventsQueryKey,
} from "@workspace/api-client-react";
import type { Event } from "@workspace/api-client-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const categoryColor: Record<string, string> = {
  Career: "#4f46e5",
  Tech:   "#10b981",
  Sports: "#f59e0b",
  Culture:"#ef4444",
};

export default function Calendar() {
  const today = new Date();
  const qc = useQueryClient();
  const { data: eventsData } = useGetEvents();
  const events = Array.isArray(eventsData) ? eventsData : [];
  const dayToEvent: Record<number, Event | undefined> = {
    13: events[0],
    15: events[1],
    20: events[2],
    22: events[3],
  };
  const eventDays = dayToEvent;
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(10); // 0-indexed: 10 = November
  const [selectedDay, setSelectedDay] = useState<number | null>(15);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const toggleRsvp = async (day: number) => {
    const ev = dayToEvent[day];
    if (!ev) return;
    if (ev.rsvp) await unrsvpEvent(ev.id);
    else await rsvpEvent(ev.id);
    qc.invalidateQueries({ queryKey: getGetEventsQueryKey() });
  };

  const selectedEvent = selectedDay ? eventDays[selectedDay] : null;

  return (
    <Layout>
      {/* Calendar card */}
      <div className="card cal-card">
        <div className="cal-nav">
          <button className="icon-btn" onClick={prevMonth}><i className="fas fa-chevron-left"></i></button>
          <h2 className="cal-title">{MONTHS[month]} {year}</h2>
          <button className="icon-btn" onClick={nextMonth}><i className="fas fa-chevron-right"></i></button>
        </div>

        <div className="calendar-grid">
          {DAYS.map(d => (
            <div key={d} className="cal-header-day">{d}</div>
          ))}

          {/* Offset empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="cal-day empty"></div>
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
            const event = eventDays[d];
            const selected = selectedDay === d;
            const todayCell = isToday(d);
            return (
              <div
                key={d}
                className={`cal-day${selected ? " active" : ""}${todayCell && !selected ? " today" : ""}${event ? " has-event" : ""}`}
                onClick={() => setSelectedDay(d === selectedDay ? null : d)}
              >
                {d}
                {event && (
                  <span
                    className="cal-dot"
                    style={{ background: categoryColor[event.category] }}
                  ></span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day event detail */}
      {selectedEvent && (
        <div className="card cal-event-detail">
          <div className="cal-event-detail-header">
            <span className="cal-event-cat-badge" style={{ background: categoryColor[selectedEvent.category] }}>
              {selectedEvent.category}
            </span>
            <span className="cal-event-detail-date">
              <i className="far fa-calendar-alt"></i> {selectedEvent.date}
            </span>
          </div>
          <h3 className="cal-event-detail-name">{selectedEvent.name}</h3>
          <div className="cal-event-detail-meta">
            <span><i className="fas fa-map-marker-alt"></i> {selectedEvent.location}</span>
            <span><i className="fas fa-users"></i> {selectedEvent.attendees} attending</span>
          </div>
          <button
            className={`btn ${selectedEvent.rsvp ? "btn-outline" : "btn-primary"} btn-sm`}
            style={{ marginTop: "12px", width: "100%" }}
            onClick={() => toggleRsvp(selectedDay!)}
          >
            {selectedEvent.rsvp ? "✓ RSVP'd — Cancel" : "RSVP to this event"}
          </button>
        </div>
      )}

      {/* Upcoming events list */}
      <div className="card">
        <h3 className="cal-section-title">
          <i className="fas fa-calendar-check" style={{ color: "var(--accent-html)" }}></i>
          Upcoming Events
        </h3>
        <div className="cal-events-list">
          {events.map((ev, idx) => {
            const day = [13, 15, 20, 22][idx] ?? idx + 1;
            const rsvpd = ev.rsvp;
            return (
              <div
                key={ev.id}
                className={`cal-event-row ${selectedDay === day ? "highlighted" : ""}`}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
              >
                <div className="cal-event-date-box" style={{ background: categoryColor[ev.category] + "18", borderColor: categoryColor[ev.category] + "44" }}>
                  <span className="cal-event-day-num" style={{ color: categoryColor[ev.category] }}>{day}</span>
                  <span className="cal-event-month-lbl">Nov</span>
                </div>
                <div className="cal-event-row-info">
                  <div className="cal-event-row-name">{ev.name}</div>
                  <div className="cal-event-row-meta">
                    <i className="fas fa-clock"></i> {ev.date.split(",")[1]?.trim()} &nbsp;·&nbsp;
                    <i className="fas fa-map-marker-alt"></i> {ev.location}
                  </div>
                </div>
                <button
                  className={`btn btn-sm ${rsvpd ? "btn-success-soft" : "btn-outline"}`}
                  style={{ flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); toggleRsvp(day); }}
                >
                  {rsvpd ? <><i className="fas fa-check"></i> Going</> : "RSVP"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
