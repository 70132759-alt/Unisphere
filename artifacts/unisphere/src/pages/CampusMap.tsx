import { useState } from "react";
import Layout from "@/components/Layout";
import { useGetBuildings } from "@workspace/api-client-react";
import type { Building } from "@workspace/api-client-react";
import campusMapImg from "@/assets/campus-map.png";

const UNIVERSITY_NAME = "University of Lahore";
const MAIN_CAMPUS_NAME = "The University of Lahore";
const UOL_MAPS_URL =
  "https://www.google.com/maps/place/The+University+of+Lahore/@31.3918614,74.2416876,17.92z/data=!4m6!3m5!1s0x3919018a8ea548c1:0x4a52db69c2c814f!8m2!3d31.3923645!4d74.2420509!16zL20vMDhnNWZo?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D";

function buildingType(b: Building): string {
  const i = b.icon;
  if (i.includes("building-columns") || i.includes("university")) return "University Campus";
  if (i.includes("mosque")) return "Mosque";
  if (i.includes("palette")) return "Creative Arts School";
  if (i.includes("swimming")) return "Club & Recreation";
  if (i.includes("trophy") || i.includes("stadium")) return "Stadium";
  if (i.includes("futbol") || i.includes("running")) return "Sports Ground";
  if (i.includes("bolt")) return "Engineering Department";
  if (i.includes("compass") || i.includes("drafting")) return "School of Architecture";
  return "Campus Facility";
}

const typeDescriptions: Record<string, string> = {
  "University Campus": "The main University of Lahore campus — admissions, faculties, lecture halls and the central administration.",
  "Mosque": "The campus mosque, open daily for the five prayers and Friday congregation for students and staff.",
  "Creative Arts School": "SOCA — the School of Creative Arts. Studios and workshops for design, media and the visual arts.",
  "Club & Recreation": "Club UOL and the campus swimming pool — fitness, recreation and a place to unwind between classes.",
  "Stadium": "The University Stadium — home ground for athletics, tournaments and major sporting events.",
  "Sports Ground": "The UOL playground — open grounds for football, cricket and everyday outdoor sports.",
  "Engineering Department": "The Electrical Engineering department — labs, classrooms and faculty offices for engineering students.",
  "School of Architecture": "The Lahore School of Architecture — design studios and crit spaces for architecture students.",
  "Campus Facility": "A key facility on the University of Lahore campus serving students and staff throughout the day.",
};

export default function CampusMap() {
  const { data: buildingsData } = useGetBuildings(); // or useGetBuildings(), keep the same hook name
  const buildings = Array.isArray(buildingsData) ? buildingsData : [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const openInMaps = (b: Building) => {
    window.open(b.mapsUrl || UOL_MAPS_URL, "_blank", "noopener,noreferrer");
  };

  const openDirections = (b: Building) => {
    const destination = `${b.name}, ${UNIVERSITY_NAME}, Lahore`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareBuilding = async (b: Building) => {
    const link = b.mapsUrl || UOL_MAPS_URL;
    const shareData = { title: b.name, text: `${b.name} — ${UNIVERSITY_NAME}`, url: link };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* fall through to copy */ }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${b.name} — ${link}`);
        showToast(`${b.name} link copied! 🔗`);
        return;
      } catch { /* fall through */ }
    }
    showToast(`Could not share ${b.name}`);
  };

  const selected: Building | undefined =
    buildings.find(b => b.id === selectedId) ?? buildings[0];

  const mainCampusUrl =
    buildings.find(b => b.name === MAIN_CAMPUS_NAME)?.mapsUrl || UOL_MAPS_URL;

  const filtered = buildings.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      {toast && (
        <div className="toast-notification"><i className="fas fa-check-circle"></i> {toast}</div>
      )}
      <div className="card" style={{ marginBottom: "0" }}>
        <div className="map-header">
          <h2 className="map-header-title">Campus Map</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="map-search-wrap">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search locations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => window.open(mainCampusUrl, "_blank", "noopener,noreferrer")}
            >
              <i className="fas fa-map-location-dot"></i> Open in Google Maps
            </button>
          </div>
        </div>

        <div className="campus-map-layout">
          <div className="campus-map-sidebar">
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Campus Locations
            </p>
            {buildings.length === 0 ? (
              <div className="map-empty-state">
                <i className="fas fa-map-signs"></i>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>No locations available</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="map-empty-state">
                <i className="fas fa-map-signs"></i>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>No locations found</div>
                <div style={{ fontSize: "12px" }}>Try a different search term.</div>
              </div>
            ) : (
              filtered.map(b => (
                <div
                  key={b.id}
                  className={`building-item ${selected?.id === b.id ? "active" : ""}`}
                  onClick={() => setSelectedId(b.id)}
                >
                  <div className="building-icon" style={{ background: b.color + "18", color: b.color }}>
                    <i className={b.icon}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{b.hours}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="campus-map-main">
            <div className="campus-map-canvas">
              <img src={campusMapImg} alt="Campus map" className="campus-map-img" />
              {buildings.map(b => (
                <button
                  key={b.id}
                  className={`map-marker ${selected?.id === b.id ? "selected" : ""}`}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, background: b.color }}
                  onClick={() => setSelectedId(b.id)}
                  title={b.name}
                >
                  <i className={b.icon}></i>
                </button>
              ))}
            </div>

            {selected && (
              <div className="map-info-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ background: selected.color + "18", color: selected.color, width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={selected.icon}></i>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{selected.name}</div>
                    <span className="info-type" style={{ background: selected.color + "18", color: selected.color }}>
                      {buildingType(selected)}
                    </span>
                  </div>
                </div>

                <p className="map-info-desc">{typeDescriptions[buildingType(selected)]}</p>

                <div className="map-info-meta">
                  <div><i className="far fa-clock"></i> {selected.hours}</div>
                  <div><i className="fas fa-location-dot"></i> {UNIVERSITY_NAME}, Lahore</div>
                </div>

                <div className="map-info-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => openInMaps(selected)} title="Open in Google Maps">
                    <i className="fas fa-map-location-dot"></i> Open in Google Maps
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => openDirections(selected)} title="Directions">
                    <i className="fas fa-diamond-turn-right"></i>
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => shareBuilding(selected)} title="Share">
                    <i className="fas fa-share-alt"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
