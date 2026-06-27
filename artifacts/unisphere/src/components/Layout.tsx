import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "./Header";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import BottomNav from "./BottomNav";
import ComposeModal from "./ComposeModal";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [loading, setLoading] = useState(false);
  const hideRightSidebar = location.startsWith("/messages");

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <div className="app-shell">
      <Header />
      <div className="app-container">
        <LeftSidebar />
        <main className="main-content">
          {loading ? (
            <div className="card">
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div className="skeleton sk-avatar"></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton sk-title"></div>
                  <div className="skeleton sk-block" style={{ width: "40%" }}></div>
                </div>
              </div>
              <div className="skeleton sk-block"></div>
              <div className="skeleton sk-block"></div>
              <div className="skeleton sk-block" style={{ width: "75%" }}></div>
              <div className="skeleton sk-img"></div>
            </div>
          ) : children}
        </main>
        {!hideRightSidebar && <RightSidebar />}
      </div>
      <BottomNav />
      <ComposeModal />
    </div>
  );
}
