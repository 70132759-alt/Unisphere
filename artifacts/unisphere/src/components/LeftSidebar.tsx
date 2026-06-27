import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useGetCurrentUser } from "@workspace/api-client-react";

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export default function LeftSidebar() {
  const [location] = useLocation();
  const { data: currentUser } = useGetCurrentUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut({ redirectUrl: basePath || "/" });
  };

  return (
    <div className="left-sidebar">
      <div className="profile">
        <Link href="/profile">
          <img src={currentUser?.avatar || undefined} alt="Profile" className="avatar-img avatar-lg" style={{ margin: "0 auto", cursor: "pointer" }} />
        </Link>
        <h3>{currentUser?.name ?? ""}</h3>
        <small>{currentUser?.major ?? ""}</small>
        <div className="connections">{formatCount(currentUser?.followersCount ?? 0)} Connections</div>
      </div>
      <div className="menu">
        <Link href="/feed" className={location === "/feed" ? "active" : ""}>
          <i className="fas fa-home"></i> <span>Dashboard</span>
        </Link>
        <Link href="/messages" className={location === "/messages" ? "active" : ""}>
          <i className="fas fa-comment-dots"></i> <span>Messages</span>
        </Link>
        <Link href="/societies" className={location === "/societies" ? "active" : ""}>
          <i className="fas fa-users"></i> <span>Societies</span>
        </Link>
        <Link href="/events" className={location === "/events" ? "active" : ""}>
          <i className="fas fa-calendar-alt"></i> <span>Events</span>
        </Link>
        <Link href="/calendar" className={location === "/calendar" ? "active" : ""}>
          <i className="far fa-calendar"></i> <span>Calendar</span>
        </Link>
        <Link href="/campus-map" className={location === "/campus-map" ? "active" : ""}>
          <i className="fas fa-map-marked-alt"></i> <span>Campus Map</span>
        </Link>
        <Link href="/jobs" className={location === "/jobs" ? "active" : ""}>
          <i className="fas fa-briefcase"></i> <span>Jobs</span>
        </Link>
        <Link href="/settings" className={location === "/settings" ? "active" : ""}>
          <i className="fas fa-cog"></i> <span>Settings</span>
        </Link>
        <a href="/" onClick={handleLogout} style={{ color: "var(--danger)", marginTop: "20px" }}>
          <i className="fas fa-sign-out-alt"></i> <span>Logout</span>
        </a>
      </div>
    </div>
  );
}
