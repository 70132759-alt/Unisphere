import { useAuth } from "@clerk/react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import {
  useGetNotifications,
  markAllNotificationsRead,
  getGetNotificationsQueryKey,
} from "@workspace/api-client-react";

export default function Notifications() {
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();

  const { data: itemsData } = useGetNotifications();
  const items = Array.isArray(itemsData) ? itemsData : [];
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const openNotification = (type: string) => {
    if (type === "message") {
      setLocation("/messages");
      return;
    }

    if (type === "event") {
      setLocation("/events");
      return;
    }

    if (type === "follow") {
      setLocation("/profile");
      return;
    }

    if (type === "like" || type === "comment" || type === "mention") {
      setLocation("/feed");
      return;
    }

    setLocation("/notifications");
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
  };

  const deleteNotification = async (id: number) => {
    const token = await getToken();

    const response = await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      console.error("Failed to delete notification");
      return;
    }

    qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
  };

  const NOTIF_PREF: Record<string, string> = {
    like: "uni-notif-likes",
    comment: "uni-notif-comments",
    follow: "uni-notif-follows",
    event: "uni-notif-events",
    message: "uni-notif-messages",
  };

  const typeEnabled = (t: string) => {
    const key = NOTIF_PREF[t];
    if (!key) return true;

    const v = localStorage.getItem(key);
    if (v === null) return true;

    try {
      return JSON.parse(v) === true;
    } catch {
      return true;
    }
  };

  const visible = items.filter((n) => typeEnabled(n.type));
  const unreadCount = visible.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? visible.filter((n) => !n.read) : visible;

  return (
    <Layout>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="notif-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Notifications</h2>
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="notif-filters">
              <button
                className={`notif-filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>

              <button
                className={`notif-filter-btn ${filter === "unread" ? "active" : ""}`}
                onClick={() => setFilter("unread")}
              >
                Unread
              </button>
            </div>

            {unreadCount > 0 && (
              <button className="mark-read-btn" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="notif-list">
          {filtered.length === 0 ? (
            <div className="notif-empty">
              <i
                className="far fa-bell"
                style={{
                  fontSize: "48px",
                  color: "var(--text-muted)",
                  marginBottom: "16px",
                }}
              ></i>
              <p>{visible.length === 0 ? "No notifications yet" : "You're all caught up! 🎉"}</p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? "unread" : ""}`}
                onClick={() => openNotification(n.type)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openNotification(n.type);
                }}
              >
                <div className="notif-avatar-wrap">
                  <img src={n.avatar} alt="Avatar" className="avatar-img" />
                  <div className="notif-icon-badge" style={{ background: n.color }}>
                    <i className={n.icon}></i>
                  </div>
                </div>

                <div className="notif-body">
                  <p>
                    <strong>{n.user}</strong> {n.action}
                    {n.detail && <span className="notif-detail"> · {n.detail}</span>}
                  </p>
                  <span className="notif-time">
                    <i className="far fa-clock"></i> {n.time}
                  </span>
                </div>

                <div className="notif-actions">
                  {!n.read && <span className="notif-status-pill">NEW</span>}

                  <button
                    className="notif-delete-btn"
                    title="Delete notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}