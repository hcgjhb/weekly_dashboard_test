/**
 * RiskTable.jsx
 * ──────────────
 * Customer risk ranking table with colour-coded risk badges.
 * Sortable columns. Shows top 10 by default, expandable.
 * Mirrors customer_risk_ranking() output from kpi_engine.py.
 */

import React, { useState } from "react";

// ─── Risk badge ───────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  High: {
    color:      "var(--risk-high)",
    background: "var(--risk-high-bg)",
    border:     "1px solid rgba(220,38,38,0.25)",
  },
  Watchlist: {
    color:      "var(--risk-watchlist)",
    background: "var(--risk-watchlist-bg)",
    border:     "1px solid rgba(217,119,6,0.25)",
  },
  Healthy: {
    color:      "var(--risk-healthy)",
    background: "var(--risk-healthy-bg)",
    border:     "1px solid rgba(22,163,74,0.25)",
  },
};

function RiskBadge({ level }) {
  const style = BADGE_STYLES[level] ?? BADGE_STYLES.Healthy;
  return (
    <span style={{
      ...style,
      fontSize:     "11px",
      fontWeight:   600,
      padding:      "2px 8px",
      borderRadius: "4px",
      letterSpacing:"0.04em",
    }}>
      {level}
    </span>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }) {
  return (
    <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: 10 }}>
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
const COLUMNS = [
  { key: "customer",     label: "Customer",         align: "left" },
  { key: "outages",      label: "Outages",           align: "right" },
  { key: "downtime_hrs", label: "Downtime (Hrs)",    align: "right" },
  { key: "avg_mttr_min", label: "Avg MTTR (Min)",    align: "right" },
  { key: "risk_score",   label: "Risk Score",        align: "right" },
  { key: "risk_level",   label: "Risk Level",        align: "center" },
];

const RISK_ORDER = { High: 0, Watchlist: 1, Healthy: 2 };

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  card: {
    background:   "var(--bg-card)",
    borderRadius: "var(--radius)",
    border:       "1px solid var(--bg-border)",
    padding:      "20px",
  },
  header: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   "16px",
  },
  title: {
    fontSize:      "11px",
    fontWeight:    700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color:         "var(--text-secondary)",
  },
  showMore: {
    background:   "transparent",
    border:       "1px solid var(--bg-border)",
    borderRadius: "var(--radius-sm)",
    color:        "var(--text-secondary)",
    fontSize:     "11px",
    padding:      "4px 10px",
    cursor:       "pointer",
    fontFamily:   "var(--font-body)",
  },
  table: {
    width:          "100%",
    borderCollapse: "collapse",
  },
  th: (align) => ({
    padding:       "8px 12px",
    fontSize:      "11px",
    fontWeight:    600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color:         "var(--text-muted)",
    textAlign:     align,
    borderBottom:  "1px solid var(--bg-border)",
    cursor:        "pointer",
    userSelect:    "none",
    whiteSpace:    "nowrap",
  }),
  td: (align) => ({
    padding:      "10px 12px",
    fontSize:     "13px",
    color:        "var(--text-primary)",
    textAlign:    align,
    borderBottom: "1px solid rgba(30,45,69,0.5)",
    fontFamily:   align === "right" ? "var(--font-mono)" : "var(--font-body)",
  }),
  trHover: {
    background: "var(--bg-card-hover)",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function RiskTable({ riskRanking }) {
  const [sortKey, setSortKey]     = useState("risk_level");
  const [sortDir, setSortDir]     = useState("asc");
  const [showAll, setShowAll]     = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  if (!riskRanking?.length) return null;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...riskRanking].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];

    // Risk level sorts by tier order
    if (sortKey === "risk_level") {
      av = RISK_ORDER[av] ?? 99;
      bv = RISK_ORDER[bv] ?? 99;
    }

    if (typeof av === "string") {
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    }
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.title}>Customer Risk Ranking</div>
        {riskRanking.length > 10 && (
          <button style={s.showMore} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show less" : `Show all ${riskRanking.length}`}
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={s.th(col.align)}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon active={sortKey === col.key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => (
              <tr
                key={row.customer}
                style={hoveredRow === i ? s.trHover : {}}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={s.td("left")}>{row.customer}</td>
                <td style={s.td("right")}>{row.outages}</td>
                <td style={s.td("right")}>{row.downtime_hrs}</td>
                <td style={s.td("right")}>{row.avg_mttr_min}</td>
                <td style={s.td("right")}>{row.risk_score}</td>
                <td style={{ ...s.td("center") }}>
                  <RiskBadge level={row.risk_level} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}