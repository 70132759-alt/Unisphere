import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import {
  useGetCurrentUser,
  createPost,
  getGetPostsQueryKey,
} from "@workspace/api-client-react";

const isVideo = (url?: string | null) =>
  !!url && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);

export default function ComposeModal() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: me } = useGetCurrentUser();
  const { uploadFile, isUploading } = useUpload();

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const close = () => {
    setOpen(false);
    setContent("");
    setImage(null);
  };

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openCompose", handler);
    return () => window.removeEventListener("openCompose", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const res = await uploadFile(file);
      if (!res) {
        showToast("Upload failed. Please try again.");
        return;
      }
      setImage((res.objectPath.startsWith("http") ? res.objectPath : `/api/storage${res.objectPath}`));
    } catch {
      showToast("Upload failed. Please try again.");
    }
  };

  const submitPost = async () => {
    if (!content.trim() && !image) {
      showToast("Write something or add a photo first.");
      return;
    }
    setSubmitting(true);
    try {
      await createPost({ content, hashtags: "", image });
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      close();
      showToast("Post published! ✨");
    } catch {
      showToast("Could not publish post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <div className="toast-notification">
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}

      {open && me && (
        <>
          <div className="drawer-backdrop" onClick={close} />
          <div className="compose-modal" role="dialog" aria-modal="true" aria-label="Create post">
            <div className="compose-modal-header">
              <button className="icon-btn" onClick={close} aria-label="Close">
                <i className="fas fa-times"></i>
              </button>
              <span>Create Post</span>
              <button
                className="btn btn-primary btn-post"
                onClick={submitPost}
                disabled={isUploading || submitting}
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
            <div className="compose-modal-body">
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <img
                  src={me.avatar}
                  className="avatar-img"
                  alt="You"
                  style={{ width: "42px", height: "42px", flexShrink: 0 }}
                />
                <textarea
                  className="compose-textarea"
                  placeholder="What's happening on campus?"
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  autoFocus
                />
              </div>
              {isUploading && (
                <div style={{ marginTop: "12px", color: "var(--text-muted)", fontSize: "14px" }}>
                  <i className="fas fa-spinner fa-spin"></i> Uploading…
                </div>
              )}
              {image && (
                <div className="post-preview-container" style={{ marginTop: "12px" }}>
                  {isVideo(image) ? (
                    <video src={image} controls className="post-preview-img" style={{ display: "block", width: "100%" }} />
                  ) : (
                    <img src={image} alt="Preview" className="post-preview-img" style={{ display: "block" }} />
                  )}
                  <div className="remove-preview" onClick={() => setImage(null)}>
                    <i className="fas fa-times"></i>
                  </div>
                </div>
              )}
            </div>
            <div className="compose-modal-footer">
              <button type="button" className="compose-action" onClick={() => photoRef.current?.click()}>
                <i className="far fa-image" style={{ color: "#10b981" }}></i> Photo
              </button>
              <button type="button" className="compose-action" onClick={() => videoRef.current?.click()}>
                <i className="fas fa-video" style={{ color: "#4f46e5" }}></i> Video
              </button>
              <button type="button" className="compose-action" onClick={() => { close(); navigate("/events"); }}>
                <i className="far fa-calendar-alt" style={{ color: "#f59e0b" }}></i> Event
              </button>
            </div>
            <input type="file" ref={photoRef} style={{ display: "none" }} accept="image/*" onChange={handleMediaChange} />
            <input type="file" ref={videoRef} style={{ display: "none" }} accept="video/*" onChange={handleMediaChange} />
          </div>
        </>
      )}
    </>
  );
}
