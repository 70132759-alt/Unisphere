import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useUpload } from "@workspace/object-storage-web";
import {
  useGetCurrentUser,
  useGetUserById,
  useGetPosts,
  deletePost,
  updateCurrentUser,
  followUser,
  unfollowUser,
  getGetCurrentUserQueryKey,
  getGetPostsQueryKey,
  getGetUserByIdQueryKey,
} from "@workspace/api-client-react";

const TAG_COLORS = [
  { bg: "#eff6ff", color: "#2563eb" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fdf4ff", color: "#9333ea" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fef9c3", color: "#ca8a04" },
];

export default function Profile() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [matchId, params] = useRoute("/profile/:id");
  const viewId = matchId ? Number(params.id) : null;
  const { data: me } = useGetCurrentUser();
  const isOwn = viewId === null || viewId === me?.id;
  const otherUser = useGetUserById(viewId ?? 0, {
    query: { enabled: !isOwn && viewId !== null, queryKey: getGetUserByIdQueryKey(viewId ?? 0) },
  });
  const profile = isOwn ? me : otherUser.data;
  const { data: postsData } = useGetPosts();
  const posts = Array.isArray(postsData) ? postsData : [];
  const { uploadFile, isUploading } = useUpload();
  const [activeTab, setActiveTab] = useState<"posts" | "about" | "connections">("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [editName, setEditName] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [following, setFollowing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio);
      setEditName(profile.name);
      setEditMajor(profile.major);
      setEditTags(profile.tags ?? []);
      setFollowing(!isOwn && Boolean((profile as typeof profile & { isFollowing?: boolean }).isFollowing));
    }
  }, [profile, isOwn]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleFollow = async () => {
    if (viewId === null) return;

    if (following) {
      await unfollowUser(viewId);
      setFollowing(false);
      showToast("Unfollowed");
    } else {
      await followUser(viewId);
      setFollowing(true);
      showToast(`Following ${profile?.name ?? ""}`);
    }

    qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    qc.invalidateQueries({ queryKey: getGetUserByIdQueryKey(viewId) });
  };

  const saveBio = async () => {
    await updateCurrentUser({ bio, name: editName, major: editMajor, tags: editTags });
    qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    setIsEditing(false);
    showToast("Profile updated!");
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const res = await uploadFile(file);
    if (!res) { showToast("Upload failed"); return; }
    await updateCurrentUser({ avatar: (res.objectPath.startsWith("http") ? res.objectPath : `/api/storage${res.objectPath}`) });
    qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    showToast("Photo updated!");
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !editTags.includes(t)) setEditTags(prev => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setEditTags(prev => prev.filter(t => t !== tag));

  const shareProfile = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href).catch(() => {});
    showToast("Profile link copied! 🔗");
  };

  const handleDelete = async (postId: number) => {
    await deletePost(postId);
    qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
    showToast("Post deleted");
    setMenuOpen(null);
  };
  if (!profile) return <Layout><div /></Layout>;

  const myPosts = posts.filter(p => p.author === profile.name);

  const tags = profile.tags ?? [];

  return (
    <Layout>
      {toast && (
        <div className="toast-notification"><i className="fas fa-check-circle"></i> {toast}</div>
      )}
      <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />

      <div className="profile-page">

        {/* ── Header card ── */}
        <div className="card profile-header-card" style={{ padding: "24px 28px" }}>
          <div className="profile-header-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>

            {/* Left: avatar + name */}
            <div className="profile-identity" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img
                  src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4f46e5&color=fff&size=80`}
                  alt={profile.name}
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #e5e7eb" }}
                />
                {isOwn && (
                  <button
                    onClick={() => avatarRef.current?.click()}
                    disabled={isUploading}
                    title="Change photo"
                    style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 24, height: 24, borderRadius: "50%",
                      background: "var(--primary-color)", border: "2px solid #fff",
                      color: "#fff", fontSize: "11px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <i className="fas fa-camera"></i>
                  </button>
                )}
              </div>

              <div className="profile-title-block">
                <h2 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{profile.name}</h2>
                {profile.major && (
                  <p style={{ margin: "3px 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>{profile.major}</p>
                )}
              </div>
            </div>

            {/* Right: action buttons */}
            <div className="profile-action-buttons" style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              {isOwn ? (
                <>
                  <button className="btn btn-outline btn-medium-small" onClick={() => setIsEditing(!isEditing)}>
                    <i className="fas fa-edit"></i> Edit Profile
                  </button>
                  <button className="btn btn-primary btn-medium-small" onClick={shareProfile}>
                    <i className="fas fa-share-alt"></i> Share
                  </button>
                </>
              ) : (
                <>
                  <button className={`btn btn-medium-small ${following ? "btn-outline" : "btn-primary"}`} onClick={toggleFollow}>
                    <i className={following ? "fas fa-user-check" : "fas fa-user-plus"}></i> {following ? "Following" : "Follow"}
                  </button>
                  <button className="btn btn-outline btn-medium-small" onClick={() => navigate("/messages")}>
                    <i className="fas fa-paper-plane"></i> Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
            <div className="profile-summary-stats" style={{ display: "flex", gap: "0", margin: "20px 0 18px" }}>
                {[
                   { value: profile.postsCount ?? 0, label: "Posts" },
                   { value: (profile.followersCount ?? 0).toLocaleString(), label: "Followers" },
                   { value: profile.followingCount ?? 0, label: "Following" },
                ].map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div className="profile-stat-divider" style={{ width: 1, height: 32, background: "var(--border-html)", margin: "0 20px" }} />}
                <div className="profile-stat-item" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1.1, color: "var(--text-primary)" }}>{s.value}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tags row */}
          {tags.length > 0 && (
            <div className="profile-tag-list" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {tags.map((tag, i) => {
                const c = TAG_COLORS[i % TAG_COLORS.length];
                return (
                  <span key={tag} style={{
                    padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                    background: c.bg, color: c.color,
                  }}>{tag}</span>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Inline edit form ── */}
        {isEditing && (
          <div className="card profile-header-card" style={{ padding: "24px 28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>Edit Profile</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Display name"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border-html)", fontSize: "14px" }}
              />
              <input
                value={editMajor}
                onChange={e => setEditMajor(e.target.value)}
                placeholder="Course / degree (e.g. BSc Computer Science · Final Year)"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border-html)", fontSize: "14px" }}
              />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                placeholder="About you — e.g. your university, interests, goals…"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border-html)", fontSize: "14px", resize: "none" }}
              />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Tags / Interests <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "12px" }}>(e.g. Final Year, Developer, Hackathon Winner)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {editTags.map(tag => (
                    <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", background: "var(--primary-light)", color: "var(--primary-color)", fontSize: "12px", fontWeight: 600 }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary-color)", padding: 0, lineHeight: 1, fontSize: "14px" }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Type a tag and press Enter…"
                    style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--border-html)", fontSize: "13px" }}
                  />
                  <button type="button" onClick={addTag} className="btn btn-outline btn-sm">Add</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", paddingTop: "4px" }}>
                <button className="btn btn-primary btn-sm" onClick={saveBio}>Save changes</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setBio(profile.bio); setEditName(profile.name); setEditMajor(profile.major); setEditTags(profile.tags ?? []); setIsEditing(false); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="profile-tabs">
          {(["posts", "about", "connections"] as const).map(tab => (
            <button
              key={tab}
              className={`profile-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Posts tab ── */}
        {activeTab === "posts" && (
          <div>
            {myPosts.length === 0 && (
              <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <i className="far fa-newspaper" style={{ fontSize: "32px", marginBottom: "10px", display: "block" }}></i>
                No posts yet
              </div>
            )}
            {myPosts.map(post => (
              <div key={post.id} className="card post-card">
                <div className="post-header">
                  <img src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4f46e5&color=fff&size=40`} className="avatar-img" alt="Avatar" />
                  <div className="post-meta">
                    <strong>{profile.name}</strong>
                    <span>{post.major}</span>
                  </div>
                  <div className="post-menu-wrap">
                    <button className="post-menu-btn" onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}>
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                    {menuOpen === post.id && (
                      <>
                        <div className="post-menu-overlay" onClick={() => setMenuOpen(null)} />
                        <div className="post-menu-dropdown">
                          <button onClick={() => { shareProfile(); setMenuOpen(null); }}><i className="fas fa-link"></i> Copy link</button>
                          {post.isOwn && (
                            <button onClick={() => handleDelete(post.id)} style={{ color: "var(--danger)" }}><i className="fas fa-trash-alt"></i> Delete post</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="post-content">
                  <p>{post.content}</p>
                  {post.image && <img src={post.image} className="post-img" alt="Post" />}
                </div>
                <div className="post-actions">
                  <span style={{ cursor: "pointer" }} onClick={() => navigate("/feed")}><i className="far fa-heart"></i> {post.likes}</span>
                  <span style={{ cursor: "pointer" }} onClick={() => navigate("/feed")}><i className="far fa-comment"></i> {post.comments}</span>
                  <span style={{ cursor: "pointer" }} onClick={shareProfile}><i className="far fa-share-square"></i> Share</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── About tab ── */}
        {activeTab === "about" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="card profile-header-card" style={{ padding: "24px 28px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "18px" }}>About</h3>
              {profile.bio && (
                <div className="about-item"><i className="fas fa-university"></i> <span>{profile.bio}</span></div>
              )}
              {profile.major && (
                <div className="about-item"><i className="fas fa-graduation-cap"></i> <span>{profile.major}</span></div>
              )}
              {profile.email && (
                <div className="about-item"><i className="fas fa-link"></i> <span>{profile.email}</span></div>
              )}
              {profile.createdAt && (
                <div className="about-item"><i className="far fa-calendar-alt"></i> <span>Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></div>
              )}
              {!profile.bio && !profile.major && !profile.email && (
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                  No details yet.{isOwn ? " Click Edit Profile to add info." : ""}
                </p>
              )}
            </div>

            {tags.length > 0 && (
              <div className="card profile-header-card" style={{ padding: "24px 28px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Interests</h3>
                <div className="profile-tag-list" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {tags.map((tag, i) => {
                    const c = TAG_COLORS[i % TAG_COLORS.length];
                    return (
                      <span key={tag} style={{
                        padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 500,
                        background: c.bg, color: c.color,
                      }}>{tag}</span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Connections tab ── */}
        {activeTab === "connections" && (
          <div className="card profile-header-card" style={{ padding: "24px 28px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
              Connections · {(profile.followersCount ?? 0).toLocaleString()}
            </h3>
            {profile.followersCount === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "14px", textAlign: "center", padding: "20px 0" }}>
                No connections yet. Start following other students to grow your network.
              </p>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                {(profile.followersCount ?? 0).toLocaleString()} follower{(profile.followersCount ?? 0) !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}

