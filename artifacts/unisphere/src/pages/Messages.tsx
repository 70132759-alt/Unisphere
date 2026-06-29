import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useUpload } from "@workspace/object-storage-web";
import {
  useGetChatContacts,
  useGetMessages,
  useGetUserSuggestions,
  sendMessage,
  getGetMessagesQueryKey,
  getGetChatContactsQueryKey,
} from "@workspace/api-client-react";

const isVideoAttachment = (url?: string | null, filename?: string | null) =>
  /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url ?? filename ?? "");

export default function Messages() {
  const qc = useQueryClient();
  const { getToken } = useAuth();

  const { data: contactsData } = useGetChatContacts();
  const contacts = Array.isArray(contactsData) ? contactsData : [];

  const { data: suggestionsData } = useGetUserSuggestions();
  const suggestions = Array.isArray(suggestionsData) ? suggestionsData : [];

  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [convoSearch, setConvoSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload();

  useEffect(() => {
    async function markMessageNotificationsRead() {
      const token = await getToken();

      await fetch("/api/notifications/type/message/read", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
    }

    markMessageNotificationsRead().catch(() => {
      // Ignore notification read errors so Messages page still works.
    });
  }, [getToken, qc]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(convoSearch.toLowerCase()),
  );

  const startContacts =
    activeId !== null && !contacts.some((contact) => contact.id === activeId)
      ? [
          ...contacts,
          ...suggestions
            .filter((suggestion) => suggestion.id === activeId)
            .map((suggestion) => ({
              id: suggestion.id,
              name: suggestion.name,
              avatar: suggestion.avatar,
              lastMsg: "",
              time: "",
              online: true,
              unread: 0,
            })),
        ]
      : contacts;

  const activeContact = startContacts.find((contact) => contact.id === activeId) ?? contacts[0];

  const { data: messages = [] } = useGetMessages(activeContact?.id ?? 0);

  const refresh = () => {
    if (!activeContact) return;

    qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(activeContact.id) });
    qc.invalidateQueries({ queryKey: getGetChatContactsQueryKey() });
  };

  const deleteConversation = async () => {
    if (!activeContact) return;

    const confirmed = window.confirm(`Delete conversation with ${activeContact.name}?`);
    if (!confirmed) return;

    const token = await getToken();

    const response = await fetch(`/api/messages/${activeContact.id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      showToast("Could not delete conversation");
      return;
    }

    qc.invalidateQueries({ queryKey: getGetChatContactsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(activeContact.id) });
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });

    setActiveId(null);
    setMobileView("list");
    showToast("Conversation deleted");
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeContact) return;

    await sendMessage({
      receiverId: activeContact.id,
      text: inputText,
    });

    setInputText("");
    refresh();
  };

  const openChat = (id: number) => {
    setActiveId(id);
    setMobileView("chat");
  };

  const startChatWith = (id: number) => {
    setShowNewChat(false);
    setConvoSearch("");
    openChat(id);
  };

  const handleAttach = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file || !activeContact) return;

    const res = await uploadFile(file);

    if (!res) {
      showToast("Upload failed");
      return;
    }

    const uploadedUrl = res.objectPath.startsWith("http")
      ? res.objectPath
      : `/api/storage${res.objectPath}`;

    await sendMessage({
      receiverId: activeContact.id,
      text: "",
      isAttachment: true,
      image: uploadedUrl,
      filename: file.name,
    } as Parameters<typeof sendMessage>[0] & { isAttachment?: boolean; image?: string | null; filename?: string | null });

    refresh();
    showToast("Attachment sent");
  };

  return (
    <Layout>
      {toast && (
        <div className="toast-notification">
          <i className="fas fa-check-circle"></i> {toast}
        </div>
      )}

      <div className="card msg-card">
        <div className="chat-layout">
          <div className={`chat-sidebar ${mobileView === "chat" ? "mobile-hidden" : ""}`}>
            <div className="chat-sidebar-header">
              <h3>Messages</h3>

              <button
                type="button"
                className="icon-btn"
                title="New message"
                onClick={() => setShowNewChat(true)}
              >
                <i className="fas fa-pen-to-square"></i>
              </button>
            </div>

            <div className="chat-search">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search conversations..."
                value={convoSearch}
                onChange={(e) => setConvoSearch(e.target.value)}
              />
            </div>

            {filteredContacts.length === 0 && (
              <div className="chat-empty">No conversations yet. Start a new chat!</div>
            )}

            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`chat-contact ${activeContact?.id === contact.id ? "active" : ""}`}
                onClick={() => openChat(contact.id)}
              >
                <div className="chat-contact-avatar">
                  <img src={contact.avatar} className="avatar-img" alt="Avatar" />
                  {contact.online && <div className="online-dot"></div>}
                </div>

                <div className="chat-contact-info">
                  <div className="chat-contact-name">{contact.name}</div>
                  <div className="chat-contact-msg">{contact.lastMsg}</div>
                </div>

                <div className="chat-contact-meta">
                  <span>{contact.time}</span>
                  {contact.unread > 0 && <div className="unread-badge">{contact.unread}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className={`chat-main ${mobileView === "list" ? "mobile-hidden" : ""}`}>
            {activeContact ? (
              <>
                <div className="chat-header">
                  <button
                    type="button"
                    className="icon-btn mobile-only"
                    style={{ marginRight: "8px" }}
                    onClick={() => setMobileView("list")}
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>

                  <div className="chat-contact-avatar">
                    <img
                      src={activeContact.avatar}
                      className="avatar-img"
                      alt="Avatar"
                      style={{ width: "36px", height: "36px" }}
                    />
                    {activeContact.online && <div className="online-dot"></div>}
                  </div>

                  <div className="chat-header-info">
                    <div className="chat-header-name">{activeContact.name}</div>
                    <div
                      className="chat-header-status"
                      style={{
                        color: activeContact.online ? "var(--success)" : "var(--text-muted)",
                      }}
                    >
                      {activeContact.online ? "● Active now" : "● Offline"}
                    </div>
                  </div>

                  <div className="chat-header-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Voice call"
                      onClick={() => showToast("Voice calls will be added in a future update")}
                    >
                      <i className="fas fa-phone"></i>
                    </button>

                    <button
                      type="button"
                      className="icon-btn"
                      title="Video call"
                      onClick={() => showToast("Video calls will be added in a future update")}
                    >
                      <i className="fas fa-video"></i>
                    </button>

                    <button
                      type="button"
                      className="icon-btn"
                      title="Conversation info"
                      onClick={() =>
                        showToast("Conversation info will be added in a future update")
                      }
                    >
                      <i className="fas fa-info-circle"></i>
                    </button>

                    <button
                      type="button"
                      className="icon-btn danger-icon"
                      title="Delete conversation"
                      onClick={deleteConversation}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                <div className="chat-messages">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message ${msg.type}`}
                      style={msg.isAttachment ? { background: "transparent", padding: 0 } : {}}
                    >
                      {msg.isAttachment ? (
                        <div style={{ maxWidth: "260px" }}>
                          {isVideoAttachment(msg.image, msg.filename) ? (
                              <video
                                src={msg.image || undefined}
                                style={{ width: "100%", borderRadius: "12px" }}
                                controls
                              />
                            ) : (
                              <img
                                src={msg.image || undefined}
                                style={{ width: "100%", borderRadius: "12px" }}
                                alt="Attachment"
                              />
                            )}
                          <div
                            style={{
                              textAlign: "center",
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              marginTop: "4px",
                            }}
                          >
                            <i className="fas fa-file"></i> {msg.filename}
                          </div>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  ))}
                </div>

                <div className="chat-input-area">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Send photo"
                    onClick={() => fileRef.current?.click()}
                    disabled={isUploading}
                  >
                    <i className="far fa-image"></i>
                  </button>

                  <button
                    type="button"
                    className="icon-btn"
                    title="Attach file"
                    onClick={() => fileRef.current?.click()}
                    disabled={isUploading}
                  >
                    <i className="fas fa-paperclip"></i>
                  </button>

                  <input
                    ref={fileRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleAttach}
                  />

                  <input
                    type="text"
                    placeholder={isUploading ? "Uploading…" : "Type a message..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                  />

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSend}
                    style={{ padding: "10px 16px", borderRadius: "12px" }}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </>
            ) : (
              <div className="chat-empty-main">
                <i className="fas fa-comments"></i>
                <p>Select a conversation or start a new one.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowNewChat(true)}
                >
                  New message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewChat && (
        <>
          <div className="app-modal-backdrop" onClick={() => setShowNewChat(false)} />

          <div className="app-modal">
            <div className="app-modal-header">
              <span>New message</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowNewChat(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="app-modal-body">
              <p className="app-modal-hint">Choose someone to start a conversation:</p>

              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="new-chat-row"
                  onClick={() => startChatWith(suggestion.id)}
                >
                  <img src={suggestion.avatar} className="avatar-img" alt={suggestion.name} />

                  <div>
                    <div className="new-chat-name">{suggestion.name}</div>
                    <div className="new-chat-sub">{suggestion.major}</div>
                  </div>

                  <i
                    className="fas fa-chevron-right"
                    style={{ marginLeft: "auto", color: "var(--text-muted)" }}
                  ></i>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
