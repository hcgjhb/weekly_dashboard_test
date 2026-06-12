/**
 * App.jsx
 * ────────
 * Root layout:
 *   [Sidebar] | [Topbar: title + date filter]
 *              [KPI Cards × 4              ]
 *              [DowntimeTrend | SeverityDonut]
 *              [FaultTypeBars | (spacer)    ]
 *              [RiskTable — full width      ]
 */

import React from "react";
import { useOutageData } from "./hooks/useOutageData";
import Sidebar          from "./components/Sidebar";
import KPICards         from "./components/KPICards";
import DowntimeTrend    from "./components/DowntimeTrend";
import SeverityDonut    from "./components/SeverityDonut";
import FaultTypeBars    from "./components/FaultTypeBars";
import RiskTable        from "./components/RiskTable";
import DateRangePicker  from "./components/DateRangePicker";

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  shell: {
    display:  "flex",
    height:   "100vh",
    overflow: "hidden",
  },
  main: {
    flex:      1,
    overflowY: "auto",
    padding:   "28px var(--gap)",
    display:   "flex",
    flexDirection: "column",
    gap:       "var(--gap)",
    minWidth:  0,
  },
  topbar: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    flexWrap:       "wrap",
    gap:            "12px",
  },
  pageTitle: {
    fontSize:   "18px",
    fontWeight: 700,
    color:      "var(--text-primary)",
    letterSpacing: "-0.01em",
  },
  pageSub: {
    fontSize:  "12px",
    color:     "var(--text-muted)",
    marginTop: "2px",
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:     "var(--gap)",
    height:  "300px",
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap:     "var(--gap)",
    height:  "280px",
  },
  // Loading / error states
  center: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    height:         "100%",
    color:          "var(--text-secondary)",
    fontSize:       "14px",
    gap:            "10px",
  },
  spinner: {
    width:           "18px",
    height:          "18px",
    border:          "2px solid var(--bg-border)",
    borderTopColor:  "#6C63FF",
    borderRadius:    "50%",
    animation:       "spin 0.7s linear infinite",
  },
  filterNote: {
    fontSize:  "11px",
    color:     "var(--text-muted)",
    marginTop: "4px",
    fontStyle: "italic",
  },
};

// ─── Keyframes injected once ──────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(22,163,74,0.6); }
  50%       { opacity: 0.5; box-shadow: none; }
}
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { data, loading, error, dateRange, setDateRange, dateBounds } =
    useOutageData();

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={s.shell}>
        {/* Sidebar */}
        <Sidebar meta={data?.meta} />

        {/* Main content */}
        <main style={s.main}>

          {/* Topbar */}
          <div style={s.topbar}>
            <div>
              <div style={s.pageTitle}>Network Outage Overview</div>
              <div style={s.pageSub}>
                Customer Assurance · Internal NOC Dashboard
              </div>
            </div>
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
              dateBounds={dateBounds}
            />
          </div>

          {/* Filter notice */}
          {data?.hasFilter && (
            <div style={s.filterNote}>
              ⚠ Fault type and severity charts reflect full dataset.
              KPI cards and trend chart are filtered to the selected range.
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={s.center}>
              <div style={s.spinner} />
              Loading dashboard data…
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ ...s.center, color: "var(--sev-s1)" }}>
              Failed to load data: {error}
            </div>
          )}

          {/* Dashboard content */}
          {data && !loading && (
            <>
              {/* Row 1 — KPI cards */}
              <KPICards kpis={data.kpis} />

              {/* Row 2 — Downtime trend + Severity donut */}
              <div style={s.row2}>
                <DowntimeTrend trend={data.trend} />
                <SeverityDonut severity={data.severity} />
              </div>

              {/* Row 3 — Fault bars (full width) */}
              <div style={s.row3}>
                <FaultTypeBars faultTypes={data.faultTypes} />
                {/* Right cell intentionally empty — available for future widget */}
                <div style={{
                  background:   "var(--bg-card)",
                  borderRadius: "var(--radius)",
                  border:       "1px dashed var(--bg-border)",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  color:        "var(--text-muted)",
                  fontSize:     "12px",
                }}>
                  Reserved for future widget
                </div>
              </div>

              {/* Row 4 — Risk table */}
              <RiskTable riskRanking={data.riskRanking} />
            </>
          )}
        </main>
      </div>
    </>
  );
}