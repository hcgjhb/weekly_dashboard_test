/**
 * Sidebar.jsx
 * ────────────
 * Left sidebar: brand mark, nav links, last updated, data date range.
 */

import React from "react";

const s = {
  sidebar: {
    width:          "var(--sidebar-w)",
    minWidth:       "var(--sidebar-w)",
    background:     "var(--bg-card)",
    borderRight:    "1px solid var(--bg-border)",
    display:        "flex",
    flexDirection:  "column",
    padding:        "24px 0",
    height:         "100vh",
    position:       "sticky",
    top:            0,
    overflowY:      "auto",
  },
  brand: {
    padding:        "0 20px 24px",
    borderBottom:   "1px solid var(--bg-border)",
  },
  brandMark: {
    display:        "flex",
    alignItems:     "center",
    gap:            "10px",
    marginBottom:   "4px",
  },
  dot: {
    width:          "8px",
    height:         "8px",
    borderRadius:   "50%",
    background:     "#6C63FF",
    boxShadow:      "0 0 8px rgba(108,99,255,0.6)",
  },
  brandName: {
    fontSize:       "13px",
    fontWeight:     700,
    color:          "var(--text-primary)",
    letterSpacing:  "0.02em",
  },
  brandSub: {
    fontSize:       "10px",
    color:          "var(--text-muted)",
    letterSpacing:  "0.06em",
    textTransform:  "uppercase",
    paddingLeft:    "18px",
  },
  nav: {
    padding:        "20px 12px",
    flex:           1,
  },
  navLabel: {
    fontSize:       "10px",
    fontWeight:     600,
    letterSpacing:  "0.1em",
    textTransform:  "uppercase",
    color:          "var(--text-muted)",
    padding:        "0 8px",
    marginBottom:   "8px",
  },
  navItem: (active) => ({
    display:        "flex",
    alignItems:     "center",
    gap:            "10px",
    padding:        "8px 10px",
    borderRadius:   "var(--radius-sm)",
    cursor:         "pointer",
    background:     active ? "var(--accent-purple-dim)" : "transparent",
    color:          active ? "#6C63FF" : "var(--text-secondary)",
    fontSize:       "13px",
    fontWeight:     active ? 600 : 400,
    marginBottom:   "2px",
    transition:     "background 0.15s, color 0.15s",
    textDecoration: "none",
    userSelect:     "none",
  }),
  navIcon: {
    fontSize: "15px",
    width:    "18px",
    textAlign:"center",
  },
  footer: {
    padding:        "16px 20px",
    borderTop:      "1px solid var(--bg-border)",
  },
  footerLabel: {
    fontSize:       "10px",
    fontWeight:     600,
    letterSpacing:  "0.08em",
    textTransform:  "uppercase",
    color:          "var(--text-muted)",
    marginBottom:   "6px",
  },
  footerValue: {
    fontSize:       "12px",
    color:          "var(--text-secondary)",
    fontFamily:     "var(--font-mono)",
  },
  pulse: {
    display:        "inline-block",
    width:          "6px",
    height:         "6px",
    borderRadius:   "50%",
    background:     "#16a34a",
    marginRight:    "6px",
    animation:      "pulse 2s infinite",
  },
};

const NAV_ITEMS = [
  { icon: "◈", label: "Overview",      active: true  },
  { icon: "⬡", label: "Trend Analysis",active: false },
  { icon: "◉", label: "Fault Types",   active: false },
  { icon: "⬟", label: "Risk Ranking",  active: false },
];

export default function Sidebar({ meta }) {
  const lastUpdated = meta?.last_updated
    ? new Date(meta.last_updated).toLocaleDateString("en-IN", {
        day:   "2-digit",
        month: "short",
        year:  "numeric",
      })
    : "—";

  const dateRange = meta
    ? `${meta.date_min} → ${meta.date_max}`
    : "—";

  return (
    <aside style={s.sidebar}>
      {/* Brand */}
      <div style={s.brand}>
        <div style={s.brandMark}>
          <div style={s.dot} />
          <span style={s.brandName}>AssureOps</span>
        </div>
        <div style={s.brandSub}>Network Dashboard</div>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navLabel}>Views</div>
        {NAV_ITEMS.map((item) => (
          <div key={item.label} style={s.navItem(item.active)}>
            <span style={s.navIcon}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* Footer meta */}
      <div style={s.footer}>
        <div style={s.footerLabel}>Data Range</div>
        <div style={{ ...s.footerValue, fontSize: "11px", marginBottom: 12 }}>
          {dateRange}
        </div>
        <div style={s.footerLabel}>Last Refreshed</div>
        <div style={s.footerValue}>
          <span style={s.pulse} />
          {lastUpdated}
        </div>
      </div>
    </aside>
  );
}