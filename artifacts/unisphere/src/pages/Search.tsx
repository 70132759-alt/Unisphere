import { Link, useSearch as useLocationSearch } from "wouter";
import Layout from "@/components/Layout";
import { useSearch, getSearchQueryKey } from "@workspace/api-client-react";

export default function Search() {
  const qs = useLocationSearch();
  const q = (new URLSearchParams(qs).get("q") ?? "").trim();
  const { data, isLoading } = useSearch(
    { q },
    { query: { enabled: q.length > 0, queryKey: getSearchQueryKey({ q }) } },
  );

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const societies = data?.societies ?? [];
  const total = users.length + posts.length + societies.length;

  return (
    <Layout>
      <div className="search-page">
        <div className="search-header">
          <h2 className="search-page-title">
            {q ? <>Results for &ldquo;<span>{q}</span>&rdquo;</> : "Search Unisphere"}
          </h2>
          {q && !isLoading && total > 0 && (
            <p className="search-summary">{total} result{total !== 1 ? "s" : ""} found</p>
          )}
        </div>

        {!q && (
          <div className="card search-state">
            <i className="fas fa-search"></i>
            <p>Search for students, posts and societies across your campus.</p>
          </div>
        )}
        {q && isLoading && (
          <div className="card search-state">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Searching…</p>
          </div>
        )}
        {q && !isLoading && total === 0 && (
          <div className="card search-state">
            <i className="far fa-frown"></i>
            <p>No results for &ldquo;{q}&rdquo;. Try a different search.</p>
          </div>
        )}

        {users.length > 0 && (
          <div className="card search-group">
            <h3 className="search-group-title">People · {users.length}</h3>
            {users.map(u => (
              <Link key={u.id} href={`/profile/${u.id}`} className="search-result-row">
                <img src={u.avatar} alt={u.name} className="avatar-img" />
                <div className="search-result-text">
                  <div className="search-result-name">{u.name}</div>
                  <div className="search-result-sub">{u.major}</div>
                </div>
                <i className="fas fa-chevron-right chev"></i>
              </Link>
            ))}
          </div>
        )}

        {societies.length > 0 && (
          <div className="card search-group">
            <h3 className="search-group-title">Societies · {societies.length}</h3>
            {societies.map(s => (
              <Link key={s.id} href="/societies" className="search-result-row">
                <div className="search-result-icon"><i className={s.icon}></i></div>
                <div className="search-result-text">
                  <div className="search-result-name">{s.name}</div>
                  <div className="search-result-sub">{s.members.toLocaleString()} members</div>
                </div>
                <i className="fas fa-chevron-right chev"></i>
              </Link>
            ))}
          </div>
        )}

        {posts.length > 0 && (
          <div className="card search-group">
            <h3 className="search-group-title">Posts · {posts.length}</h3>
            {posts.map(p => (
              <Link key={p.id} href="/feed" className="search-result-row">
                <img src={p.avatar} alt={p.author} className="avatar-img" />
                <div className="search-result-text">
                  <div className="search-result-name">{p.author}</div>
                  <div className="search-result-sub">
                    {p.content.slice(0, 70)}{p.content.length > 70 ? "…" : ""}
                  </div>
                </div>
                <i className="fas fa-chevron-right chev"></i>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
