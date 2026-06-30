import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useUpload } from "@workspace/object-storage-web";
import {
  useGetCurrentUser,
  useGetPosts,
  updateCurrentUser,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";

type FontSize = "Small" | "Medium" | "Large";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button className={`settings-toggle ${on ? "on" : ""}`} onClick={onChange} aria-label="toggle">
      <span className="settings-toggle-thumb" />
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card settings-section">
      <div className="settings-section-title">
        <i className={icon} style={{ color: "var(--accent-html)" }}></i>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {sub && <span className="settings-row-sub">{sub}</span>}
      </div>
      <div className="settings-row-right">{right}</div>
    </div>
  );
}

function NavRow({ label, sub, icon, onClick }: { label: string; sub?: string; icon?: string; onClick?: () => void }) {
  return (
    <button type="button" className="settings-row settings-nav-row" onClick={onClick}>
      <div className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {sub && <span className="settings-row-sub">{sub}</span>}
      </div>
      <i className={icon || "fas fa-chevron-right"} style={{ color: "var(--text-muted)", fontSize: "13px" }}></i>
    </button>
  );
}

export default function Settings() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { signOut } = useClerk();
  const { data: currentUser } = useGetCurrentUser();
  const { data: posts = [] } = useGetPosts();
  const { uploadFile, isUploading } = useUpload();
  const avatarRef = useRef<HTMLInputElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [notifLikes, setNotifLikes]         = useState(true);
  const [notifComments, setNotifComments]   = useState(true);
  const [notifFollows, setNotifFollows]     = useState(true);
  const [notifEvents, setNotifEvents]       = useState(false);
  const [notifMessages, setNotifMessages]   = useState(true);
  const [privPublic, setPrivPublic]         = useState(true);
  const [privActivity, setPrivActivity]     = useState(false);
  const [privSearch, setPrivSearch]         = useState(true);
  const [compactFeed, setCompactFeed]       = useState(false);
  const [emailDigest, setEmailDigest]       = useState(true);
  const [fontSize, setFontSize]             = useState<FontSize>("Medium");
  const [saved, setSaved]                   = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);
  const [modal, setModal]                   = useState<{ title: string; body: React.ReactNode } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const persist = (key: string, val: boolean) => localStorage.setItem(key, JSON.stringify(val));

  const toggleHandler =
    (key: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
      setter(prev => { const next = !prev; persist(key, next); return next; });
      showToast("Setting saved");
    };

  const toggleCompact = () => {
    setCompactFeed(prev => {
      const next = !prev;
      persist("uni-compact", next);
      document.body.classList.toggle("compact-feed", next);
      return next;
    });
    showToast("Setting saved");
  };

  useEffect(() => {
    const storedFont = (localStorage.getItem("uni-font") as FontSize) || "Medium";
    setFontSize(storedFont);
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("uni-dark");
    document.documentElement.classList.remove("font-small", "font-large");
    if (storedFont !== "Medium") document.documentElement.classList.add(`font-${storedFont.toLowerCase()}`);

    const read = (key: string, def: boolean) => {
      const v = localStorage.getItem(key);
      if (v === null) return def;
      try { return JSON.parse(v) === true; } catch { return def; }
    };
    setNotifLikes(read("uni-notif-likes", true));
    setNotifComments(read("uni-notif-comments", true));
    setNotifFollows(read("uni-notif-follows", true));
    setNotifEvents(read("uni-notif-events", false));
    setNotifMessages(read("uni-notif-messages", true));
    setEmailDigest(read("uni-email-digest", true));
    setPrivPublic(read("uni-priv-public", true));
    setPrivActivity(read("uni-priv-activity", false));
    setPrivSearch(read("uni-priv-search", true));
    const compact = read("uni-compact", false);
    setCompactFeed(compact);
    document.body.classList.toggle("compact-feed", compact);
  }, []);

  const cycleFont = () => {
    const order: FontSize[] = ["Small", "Medium", "Large"];
    const next = order[(order.indexOf(fontSize) + 1) % order.length];
    setFontSize(next);
    document.documentElement.classList.remove("font-small", "font-large");
    if (next !== "Medium") document.documentElement.classList.add(`font-${next.toLowerCase()}`);
    localStorage.setItem("uni-font", next);
  };

  const handleSave = () => {
    setSaved(true);
    showToast("All changes saved");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const res = await uploadFile(file);
      if (!res) { showToast("Photo upload failed. Please try again."); return; }
      await updateCurrentUser({ avatar: (res.objectPath.startsWith("http") ? res.objectPath : `/api/storage${res.objectPath}`) });
      qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      showToast("Profile photo updated");
    } catch {
      showToast("Photo upload failed. Please try again.");
    }
  };

  const downloadData = () => {
    const myPosts = posts.filter(p => p.author === currentUser?.name);
    const blob = new Blob([JSON.stringify({ profile: currentUser, posts: myPosts }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unisphere-data.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Your data is downloading...");
  };

  const info = (title: string, text: string) => () => setModal({ title, body: <p style={{ lineHeight: 1.6 }}>{text}</p> });

  return (
    <Layout>
      {toast && (
        <div className="toast-notification">
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatar} />

      {/* Profile summary */}
      <div className="card settings-profile-banner">
        <div className="settings-avatar-wrap">
          <img src={currentUser?.avatar || undefined} alt="Avatar" className="settings-avatar" />
          <button className="settings-avatar-edit" title="Change photo" onClick={() => avatarRef.current?.click()} disabled={isUploading}>
            <i className="fas fa-camera"></i>
          </button>
        </div>
        <div className="settings-profile-info">
          <div className="settings-profile-name">{currentUser?.name ?? ""}</div>
          <div className="settings-profile-major">{currentUser?.major ?? ""}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate("/profile")}>Edit Profile</button>
      </div>

      {/* Account */}
      <Section title="Account" icon="fas fa-user-circle">
        <NavRow label="Full Name" sub={currentUser?.name ?? ""} onClick={info("Full Name", "Your display name is shown across Unisphere. Edit it from your profile page.")} />
        <NavRow label="Email" sub={currentUser?.email ?? ""} onClick={info("Email", "Your account email is managed by your sign-in provider.")} />
        <NavRow label="Major / Course" sub={currentUser?.major || "Not set â€” edit your profile"} onClick={info("Major / Course", "Your course or field of study. Edit it from your profile page.")} />
        <NavRow label="Change Password" onClick={info("Change Password", "Passwords are handled securely by your sign-in provider. Use 'Forgot password' on the sign-in screen to reset.")} />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon="far fa-bell">
        <Row label="Likes on your posts" sub="Local preference - controls what appears in Notifications" right={<Toggle on={notifLikes}     onChange={toggleHandler("uni-notif-likes", setNotifLikes)} />} />
        <Row label="Comments" sub="Local preference - controls what appears in Notifications" right={<Toggle on={notifComments}  onChange={toggleHandler("uni-notif-comments", setNotifComments)} />} />
        <Row label="New followers" sub="Local preference - controls what appears in Notifications" right={<Toggle on={notifFollows}   onChange={toggleHandler("uni-notif-follows", setNotifFollows)} />} />
        <Row label="Event reminders" sub="Local preference - controls what appears in Notifications" right={<Toggle on={notifEvents}    onChange={toggleHandler("uni-notif-events", setNotifEvents)} />} />
        <Row label="Direct messages" sub="Local preference - controls what appears in Notifications" right={<Toggle on={notifMessages}  onChange={toggleHandler("uni-notif-messages", setNotifMessages)} />} />
        <Row label="Weekly email digest" sub="Local preference - saved for email updates" right={<Toggle on={emailDigest}    onChange={toggleHandler("uni-email-digest", setEmailDigest)} />} />
      </Section>

      {/* Privacy */}
      <Section title="Privacy & Safety" icon="fas fa-shield-alt">
        <Row label="Public profile" sub="Local preference - saved on this device" right={<Toggle on={privPublic} onChange={toggleHandler("uni-priv-public", setPrivPublic)} />} />
        <Row label="Show activity status" sub="Local preference - saved on this device" right={<Toggle on={privActivity} onChange={toggleHandler("uni-priv-activity", setPrivActivity)} />} />
        <Row label="Appear in search" sub="Local preference - saved on this device" right={<Toggle on={privSearch} onChange={toggleHandler("uni-priv-search", setPrivSearch)} />} />
        <NavRow label="Blocked accounts" sub="Manage who can't see your profile" onClick={() => setModal({ title: "Blocked accounts", body: <p>You haven't blocked anyone. Blocked accounts will appear here.</p> })} />
        <NavRow label="Data & downloads" sub="Download a copy of your data" onClick={downloadData} />
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon="fas fa-paint-brush">
        <Row label="Compact feed" sub="Show more posts with less spacing" right={<Toggle on={compactFeed} onChange={toggleCompact} />} />
        <NavRow label="Font size" sub={fontSize} onClick={cycleFont} />
        <NavRow label="Language" sub="English (UK)" onClick={() => setModal({ title: "Language", body: <p>Unisphere is currently available in English (UK). More languages are coming soon.</p> })} />
      </Section>

      {/* About */}
      <Section title="About Unisphere" icon="fas fa-info-circle">
        <NavRow label="Terms of Service" onClick={info("Terms of Service", "By using Unisphere you agree to use the platform respectfully, follow your university's code of conduct, and not misuse other students' data.")} />
        <NavRow label="Privacy Policy" onClick={info("Privacy Policy", "We store only what's needed to run your campus network. You can download a copy of your data any time from Privacy & Safety.")} />
        <NavRow label="Help & Support" onClick={info("Help & Support", "Need a hand? Reach out to your campus IT team or email support@unisphere.app and we'll get back to you.")} />
        <NavRow label="Send Feedback" onClick={() => setModal({
          title: "Send Feedback",
          body: <p>We'd love to hear from you! Email <strong>feedback@unisphere.app</strong> with your ideas and we'll review them.</p>,
        })} />
        <div className="settings-row" style={{ justifyContent: "center", borderBottom: "none" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Unisphere v1.0.0 Â· Made with â¤ï¸ for students</span>
        </div>
      </Section>

      {/* Role & Access */}
      <Section title="Role & Access" icon="fas fa-user-shield">
        <Row
          label="Current Access"
          sub="Final prototype model for verified university members"
          right={
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-html)" }}>
              Verified UOL User
            </span>
          }
        />

        <div style={{ display: "grid", gap: "10px", marginTop: "12px" }}>
          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-row-label">Student</span>
              <span className="settings-row-sub">Feed, societies, events, jobs, messages, map and profile access</span>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-row-label">Faculty / Teacher</span>
              <span className="settings-row-sub">Can share academic updates, jobs, internships and event information</span>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <span className="settings-row-label">Admin</span>
              <span className="settings-row-sub">Full moderation and user-management dashboard planned for production version</span>
            </div>
          </div>
        </div>

        <p style={{ margin: "14px 0 0", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          The final prototype uses a verified UOL-user access model. Separate Student, Faculty and Admin permission levels are part of the documented production scope.
        </p>
      </Section>
      {/* Save button */}
      <div style={{ padding: "0 0 24px" }}>
        <button className="btn btn-primary" style={{ width: "100%", padding: "14px" }} onClick={handleSave}>
          {saved ? <><i className="fas fa-check"></i> Saved!</> : "Save Changes"}
        </button>
      </div>

      {/* Logout */}
      <div style={{ padding: "0 0 40px" }}>
        <button className="settings-logout-btn" onClick={() => signOut({ redirectUrl: basePath || "/" })}>
          <i className="fas fa-sign-out-alt"></i> Log out
        </button>
      </div>

      {modal && (
        <>
          <div className="app-modal-backdrop" onClick={() => setModal(null)} />
          <div className="app-modal">
            <div className="app-modal-header">
              <span>{modal.title}</span>
              <button className="icon-btn" onClick={() => setModal(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="app-modal-body">{modal.body}</div>
          </div>
        </>
      )}
    </Layout>
  );
}
