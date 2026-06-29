import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUserSuggestions,
  useGetTrending,
  followUser,
  unfollowUser,
  getGetUserSuggestionsQueryKey,
} from "@workspace/api-client-react";

export default function RightSidebar() {
  const qc = useQueryClient();
  const { data: suggestions = [] } = useGetUserSuggestions();
  const suggestionList = Array.isArray(suggestions) ? suggestions : [];
  const { data: trending = [] } = useGetTrending();
  const trendingList = Array.isArray(trending) ? trending : [];

  const toggleFollow = async (id: number, isFollowing: boolean) => {
    if (isFollowing) await unfollowUser(id);
    else await followUser(id);
    qc.invalidateQueries({ queryKey: getGetUserSuggestionsQueryKey() });
  };

  return (
    <div className="right-sidebar">
      <div className="card">
        <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>Who to Follow</h3>
        {suggestionList.length === 0 && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No suggestions yet</p>
        )}
        {suggestionList.map(s => (
          <div key={s.id} className="suggestion-item">
            <Link href={`/profile/${s.id}`} className="suggestion-info" style={{ textDecoration: "none", color: "inherit" }}>
              <img src={s.avatar} alt="Avatar" className="avatar-img" />
              <div>
                <div>{s.name}</div>
                <div>{s.major}</div>
              </div>
            </Link>
            <button
              className={`btn btn-mini ${s.isFollowing ? "btn-outline" : "btn-primary"}`}
              onClick={() => toggleFollow(s.id, s.isFollowing)}
            >
              {s.isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>Trending Now</h3>
        {trendingList.length === 0 && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No trending topics yet</p>
        )}
        {trendingList.map(t => (
          <Link
            key={t.rank}
            href={`/search?q=${encodeURIComponent(t.title)}`}
            className="trending-item"
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="trending-rank">#{t.rank}</div>
              <div className="trending-text">
                <div>{t.title}</div>
                <div>{t.posts}</div>
              </div>
            </div>
            <div className="trending-icon">
              <i className="fas fa-arrow-trend-up"></i>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


