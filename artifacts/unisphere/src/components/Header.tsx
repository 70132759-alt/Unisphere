import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { useGetCurrentUser, useSearch, getSearchQueryKey, useGetNotifications, type Job } from "@workspace/api-client-react";

type SearchResultsWithJobs = {
  jobs?: Job[];
};

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [location, navigate] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const { data: currentUser } = useGetCurrentUser();
  const { data: notifications = [] } = useGetNotifications();
  const notificationList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationList.filter(n => !n.read).length;
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(searchQuery.trim()), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const { data: results } = useSearch(
    { q: debounced },
    { query: { enabled: debounced.length > 0, queryKey: getSearchQueryKey({ q: debounced }) } },
  );

  const users = results?.users ?? [];
  const societies = results?.societies ?? [];
  const posts = results?.posts ?? [];
  const jobs = (results as SearchResultsWithJobs | undefined)?.jobs ?? [];
  const total = users.length + societies.length + posts.length + jobs.length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showMobileSearch) mobileSearchRef.current?.focus();
  }, [showMobileSearch]);

  if (location === "/" || location.startsWith("/sign-in") || location.startsWith("/sign-up")) return null;

  const closeSearch = () => {
    setShowDropdown(false);
    setShowMobileSearch(false);
    setSearchQuery("");
  };

  const goToResults = () => {
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    closeSearch();
  };

  const SearchDropdown = () => (
    showDropdown && searchQuery.length > 0 ? (
      <div className="search-dropdown active">
        {total > 0 ? (
          <>
            {users.slice(0, 4).map(u => (
              <div key={`u${u.id}`} className="search-item" onClick={() => { closeSearch(); navigate(`/profile/${u.id}`); }}>
                <img src={u.avatar} alt={u.name} />
                <div className="search-item-text">
                  <div>{u.name}</div>
                  <div>{u.major}</div>
                </div>
              </div>
            ))}
            {societies.slice(0, 3).map(s => (
              <div key={`s${s.id}`} className="search-item" onClick={() => { closeSearch(); navigate("/societies"); }}>
                <div className="search-item-icon"><i className={s.icon}></i></div>
                <div className="search-item-text">
                  <div>{s.name}</div>
                  <div>{s.members.toLocaleString()} members · Society</div>
                </div>
              </div>
            ))}
            {jobs.slice(0, 3).map(j => (
              <div key={`j${j.id}`} className="search-item" onClick={() => { closeSearch(); navigate("/jobs"); }}>
                <img src={j.logo} alt={j.company} />
                <div className="search-item-text">
                  <div>{j.title}</div>
                  <div>{j.company} - {j.location}</div>
                </div>
              </div>
            ))}
            {posts.slice(0, 3).map(p => (
              <div key={`p${p.id}`} className="search-item" onClick={() => { closeSearch(); navigate("/feed"); }}>
                <img src={p.avatar} alt={p.author} />
                <div className="search-item-text">
                  <div>{p.author}</div>
                  <div>{p.content.substring(0, 40)}…</div>
                </div>
              </div>
            ))}
            <div className="search-item search-item-all" onClick={goToResults}>
              <div className="search-item-text"><div>See all results for “{searchQuery}”</div></div>
            </div>
          </>
        ) : (
          <div className="search-item">
            <div className="search-item-text"><div>No results found</div></div>
          </div>
        )}
      </div>
    ) : null
  );

  return (
    <>
      <header id="appHeader">
        {/* Logo */}
        <Link href="/feed" className="logo" style={{ textDecoration: "none" }}>
          <i className="fa-solid fa-atom"></i>
          <span>Unisphere</span>
        </Link>

        {/* Desktop search bar */}
        <div className="search desktop-search" ref={dropdownRef}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search students, societies, posts, or jobs..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(e.target.value.length > 0); }}
            onFocus={() => { if (searchQuery.length > 0) setShowDropdown(true); }}
            onKeyDown={e => e.key === "Enter" && goToResults()}
          />
          <SearchDropdown />
        </div>

        {/* Header icons */}
        <div className="header-icons">
          {/* Mobile: search icon */}
          <button className="mobile-only icon-btn" onClick={() => setShowMobileSearch(v => !v)}>
            <i className="fas fa-search"></i>
          </button>

          <button
            className="header-icon-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("openCompose"))}
            title="Create post"
          >
            <i className="fas fa-pen-to-square"></i>
          </button>

          <Link href="/notifications" className="header-icon-btn">
            <i className="far fa-bell"></i>
            {unreadCount > 0 && (
  <span className="notification-count-badge">
    {unreadCount > 9 ? "9+" : unreadCount}
  </span>
)}
          </Link>

          <Link href="/profile" className="desktop-only">
            <img
              src={currentUser?.avatar || undefined}
              alt="Avatar"
              className="avatar-img"
              style={{ marginLeft: "8px", cursor: "pointer", width: "34px", height: "34px" }}
            />
          </Link>

          <button
            className="header-icon-btn desktop-only"
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            title="Sign out"
          >
            <i className="fas fa-right-from-bracket"></i>
          </button>
        </div>
      </header>
      {/* Mobile search overlay */}
      {showMobileSearch && (
        <div className="mobile-search-bar" ref={dropdownRef}>
          <i className="fas fa-search"></i>
          <input
            ref={mobileSearchRef}
            type="text"
            placeholder="Search students, societies, posts, or jobs..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(e.target.value.length > 0); }}
            onKeyDown={e => e.key === "Enter" && goToResults()}
          />
          <button className="icon-btn" onClick={closeSearch}>
            <i className="fas fa-times"></i>
          </button>
          <SearchDropdown />
        </div>
      )}
    </>
  );
}
