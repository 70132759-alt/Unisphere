import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useUpload } from "@workspace/object-storage-web";
import {
  useGetPosts,
  useGetStories,
  useGetCurrentUser,
  createStory,
  likePost,
  unlikePost,
  deletePost,
  deleteStory,
  createComment,
  getGetPostsQueryKey,
  getGetStoriesQueryKey,
} from "@workspace/api-client-react";
import type { Post, Story } from "@workspace/api-client-react";

const storyTimeLeft = (createdAt?: string | null, now = Date.now()) => {
  if (!createdAt) return null;

  const ms = 24 * 60 * 60 * 1000 - (now - new Date(createdAt).getTime());

  if (ms <= 0) return null;

  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const isVideo = (url?: string | null) => !!url && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);

export default function Feed() {
  const qc = useQueryClient();
  const postsQuery = useGetPosts();
  const storiesQuery = useGetStories();
  const meQuery = useGetCurrentUser();
  const { uploadFile } = useUpload();
  const [now, setNow] = useState(Date.now());

useEffect(() => {
  const timer = window.setInterval(() => {
    setNow(Date.now());
    qc.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
  }, 60000);

  return () => window.clearInterval(timer);
}, [qc]);

  const posts = Array.isArray(postsQuery.data) ? postsQuery.data : [];
  const stories = Array.isArray(storiesQuery.data) ? storiesQuery.data : [];
  const me = meQuery.data;

  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [viewerStory, setViewerStory] = useState<Story | null>(null);
  const storyRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });

  const handleLike = async (post: Post) => {
    if (post.isLiked) await unlikePost(post.id);
    else await likePost(post.id);
    invalidate();
  };

  const handleStoryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !me) return;
    const res = await uploadFile(file);
    if (!res) { showToast("Upload failed"); return; }
    await createStory({ name: me.name, image: (res.objectPath.startsWith("http") ? res.objectPath : `/api/storage${res.objectPath}`) });
    qc.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
    showToast("Story added! ✨");
  };

  const toggleComments = (postId: number) => {
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const submitComment = async (postId: number) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await createComment(postId, { text });
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    invalidate();
  };

  const handleDelete = async (postId: number) => {
    await deletePost(postId);
    qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
    showToast("Post deleted");
    setMenuOpen(null);
  };

  const handleDeleteStory = async (e: React.MouseEvent, storyId: number) => {
    e.stopPropagation();
    await deleteStory(storyId);
    qc.invalidateQueries({ queryKey: getGetStoriesQueryKey() });
    showToast("Story deleted");
  };

  const handleShare = (author: string) => {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href).catch(() => {});
    showToast(`${author}'s post link copied! 🔗`);
  };

  return (
    <Layout>
      {toast && (
        <div className="toast-notification">
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}

      <input ref={storyRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleStoryChange} />

      <div className="stories-container">
        {stories.map(story => (
          <div
            key={story.id}
            className="story-item"
            onClick={() => story.isAdd ? storyRef.current?.click() : setViewerStory(story)}
            style={{ cursor: "pointer" }}
          >
            {story.isAdd ? (
              <>
                <div className="story-add"><i className="fas fa-plus"></i></div>
                <div className="story-name">Add Story</div>
              </>
            ) : (
              <>
                <div className="story-ring" style={{ position: "relative" }}>
                  <img src={story.image || undefined} alt={story.name} className="story-img" />
                  {storyTimeLeft(story.createdAt, now) && (
                    <span style={{
                      position: "absolute", bottom: 0, right: 0,
                      background: "rgba(0,0,0,0.65)", color: "#fff",
                      fontSize: "9px", fontWeight: 700, borderRadius: "8px",
                      padding: "1px 4px", lineHeight: "14px",
                    }}>{storyTimeLeft(story.createdAt, now)}</span>
                  )}
                  {story.isOwn && (
                    <button
                      onClick={e => handleDeleteStory(e, story.id)}
                      style={{
                        position: "absolute", top: -4, right: -4,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "#ef4444", border: "2px solid #fff",
                        color: "#fff", fontSize: "10px", fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        lineHeight: 1, padding: 0,
                      }}
                      title="Delete story"
                    >×</button>
                  )}
                </div>
                <div className="story-name">{story.name}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div id="feedContainer">
        {posts.length === 0 && (
          <div className="card empty-state">
            <i className="far fa-newspaper"></i>
            <p>No posts yet</p>
          </div>
        )}
        {posts.map(post => (
          <div key={post.id} className="card post-card">
            <div className="post-header">
              <img src={post.avatar} className="avatar-img" alt="Avatar" />
              <div className="post-meta">
                <strong>{post.author}</strong>
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
                      <button onClick={() => { handleShare(post.author); setMenuOpen(null); }}><i className="fas fa-link"></i> Copy link</button>
                      {post.isOwn && (
                        <button onClick={() => handleDelete(post.id)} style={{ color: "var(--danger)" }}><i className="fas fa-trash-alt"></i> Delete post</button>
                      )}
                      {!post.isOwn && <button onClick={() => { showToast("Thanks — we'll show fewer posts like this."); setMenuOpen(null); }}><i className="far fa-eye-slash"></i> Not interested</button>}
                      {!post.isOwn && <button onClick={() => { showToast("Post reported. Our team will review it."); setMenuOpen(null); }}><i className="far fa-flag"></i> Report post</button>}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="post-content">
              <p>{post.content}</p>
              {post.hashtags && <div className="post-hashtags">{post.hashtags}</div>}
              {post.image && (isVideo(post.image)
                ? <video src={post.image} controls className="post-img" />
                : <img src={post.image} className="post-img" alt="Post" />)}
            </div>

            <div className="post-stats">
              <span>{post.likes} likes</span>
              <span style={{ cursor: "pointer" }} onClick={() => toggleComments(post.id)}>
                {post.comments} comments
              </span>
            </div>

            <div className="post-actions">
              <span className={post.isLiked ? "heart-active" : ""} onClick={() => handleLike(post)}>
                <i className={post.isLiked ? "fas fa-heart" : "far fa-heart"}></i>
                {post.isLiked ? " Liked" : " Like"}
              </span>
              <span onClick={() => toggleComments(post.id)}>
                <i className="far fa-comment"></i> Comment
              </span>
              <span onClick={() => handleShare(post.author)}>
                <i className="far fa-share-square"></i> Share
              </span>
            </div>

            {openComments[post.id] && (
              <div className="comments-section">
                {post.commentList.map(c => (
                  <div key={c.id} className="comment-item">
                    <img src={c.avatar} alt="Avatar" className="avatar-img" style={{ width: "32px", height: "32px", flexShrink: 0 }} />
                    <div className="comment-bubble">
                      <strong>{c.author}</strong>
                      <p>{c.text}</p>
                      <span className="comment-time">{c.time}</span>
                    </div>
                  </div>
                ))}
                <div className="comment-input-row">
                  {me && <img src={me.avatar} alt="You" className="avatar-img" style={{ width: "32px", height: "32px", flexShrink: 0 }} />}
                  <div className="comment-input-wrap">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[post.id] || ""}
                      onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && submitComment(post.id)}
                    />
                    <button onClick={() => submitComment(post.id)}>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewerStory && (
        <div className="story-viewer" onClick={() => setViewerStory(null)}>
          <button className="story-viewer-close" onClick={() => setViewerStory(null)}><i className="fas fa-times"></i></button>
          <div className="story-viewer-content" onClick={e => e.stopPropagation()}>
            <div className="story-viewer-header">
              <img src={viewerStory.image ?? ""} className="avatar-img" alt={viewerStory.name} />
              <span>{viewerStory.name}</span>
            </div>
            <img src={viewerStory.image ?? ""} className="story-viewer-img" alt={viewerStory.name} />
          </div>
        </div>
      )}
    </Layout>
  );
}
