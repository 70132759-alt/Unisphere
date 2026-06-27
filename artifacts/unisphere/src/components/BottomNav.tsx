import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useGetCurrentUser } from "@workspace/api-client-react";

const primaryLinks = [
  { href: "/feed",          icon: "fas fa-home",         label: "Home" },
  { href: "/messages",      icon: "fas fa-comment-dots", label: "Messages" },
  { href: "/notifications", icon: "far fa-bell",         label: "Alerts" },
  { href: "/profile",       icon: null,                  label: "Me", isAvatar: true },
];

const moreLinks = [
  { href: "/societies",  icon: "fas fa-users",          label: "Societies & Clubs",  color: "#4f46e5" },
  { href: "/events",     icon: "far fa-calendar-alt",   label: "Events",              color: "#f59e0b" },
  { href: "/jobs",       icon: "fas fa-briefcase",      label: "Jobs & Internships",  color: "#10b981" },
  { href: "/calendar",   icon: "far fa-calendar",       label: "Calendar",            color: "#3b82f6" },
  { href: "/campus-map", icon: "fas fa-map-marked-alt", label: "Campus Map",          color: "#ec4899" },
  { href: "/settings",   icon: "fas fa-cog",            label: "Settings",            color: "#64748b" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: currentUser } = useGetCurrentUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  if (location === "/" || location.startsWith("/sign-in") || location.startsWith("/sign-up")) return null;

  const handleMoreNav = (href: string) => {
    setDrawerOpen(false);
    setLocation(href);
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await signOut({ redirectUrl: basePath || "/" });
  };

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Slide-up drawer */}
      <div className={`more-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="more-drawer-handle" onClick={() => setDrawerOpen(false)} />
        <div className="more-drawer-header">
          <img src={currentUser?.avatar || undefined} alt="Avatar" className="avatar-img" style={{ width: 44, height: 44 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{currentUser?.name ?? ""}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{currentUser?.major ?? ""}</div>
          </div>
        </div>

        <div className="more-drawer-grid">
          {moreLinks.map(link => (
            <button
              key={link.href}
              className="more-drawer-item"
              onClick={() => handleMoreNav(link.href)}
            >
              <div className="more-drawer-icon" style={{ background: link.color + "18", color: link.color }}>
                <i className={link.icon}></i>
              </div>
              <span>{link.label}</span>
            </button>
          ))}
        </div>

        <div style={{ padding: "0 20px 8px" }}>
          <button className="more-drawer-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Log Out
          </button>
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav className="bottom-nav">
        {primaryLinks.map(link => {
          const active = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`bottom-nav-item ${active ? "active" : ""}`}
            >
              {link.isAvatar ? (
                <img
                  src={currentUser?.avatar || undefined}
                  alt="Me"
                  className="bottom-nav-avatar"
                  style={{ border: active ? "2.5px solid var(--accent-html)" : "2.5px solid transparent" }}
                />
              ) : (
                <i className={link.icon!}></i>
              )}
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          className={`bottom-nav-item ${drawerOpen ? "active" : ""}`}
          onClick={() => setDrawerOpen(v => !v)}
        >
          <i className="fas fa-th" style={{ fontSize: 20 }}></i>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
