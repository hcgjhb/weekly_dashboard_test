/**
 * KPICards.jsx
 * ─────────────
 * Four top-level metric cards.
 * Signature element: large JetBrains Mono numbers with a left accent bar
 * that subtly references network signal strength — like a rack status panel.
 */

import React from "react";

const CARDS = [
  {
    key:    "totalOutages",
    label:  "Total Outages",
    accent: "#6C63FF",
    suffix: "",
    getValue: (k) => k.totalOutages,
  },
  {
    key:    "avgMttr",
    label:  "Avg MTTR",
    accent: "#00BFFF",
    suffix: " min",
    getValue: (k) => k.avgMttr ?? k.avg_mttr,
  },
  {
    key:    "customersImpacted",
    label:  "Customers Impacted",
    accent: "#F97316",
    suffix: "",
    getValue: (k) => k.customersImpacted ?? k.customers_impacted,
  },
  {
    key:    "totalDowntime",
    label:  "Total Downtime",
    accent: "#EF4444",
    suffix: " hrs",
    transform: (v) => (v / 60).toFixed(1),
    getValue: (k) => k.totalDowntimeMins ?? k.total_downtime_mins,
  },
];

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--gap)",
  },
  card: {
    background:   "var(--bg-card)",
    borderRadius: "var(--radius)",
    border:       "1px solid var(--bg-border)",
    padding:      "20px 20px 20px 0",
    display:      "flex",
    alignItems:   "stretch",
    overflow:     "hidden",
    transition:   "border-color 0.2s",
  },
  accentBar: (color) => ({
    width:        "4px",
    minWidth:     "4px",
    background:   color,
    borderRadius: "0 2px 2px 0",
    marginRight:  "18px",
    flexShrink:   0,
  }),
  content: {
    flex: 1,
  },
  label: {
    fontSize:     "11px",
    fontWeight:   600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color:        "var(--text-secondary)",
    marginBottom: "10px",
  },
  value: {
    fontFamily:  "var(--font-mono)",
    fontSize:    "32px",
    fontWeight:  600,
    color:       "var(--text-primary)",
    lineHeight:  1,
    letterSpacing: "-0.02em",
  },
  suffix: {
    fontSize:   "14px",
    fontWeight: 400,
    color:      "var(--text-secondary)",
    marginLeft: "3px",
  },
};

export default function KPICards({ kpis }) {
  if (!kpis) return null;

  return (
    <div style={styles.grid}>
      {CARDS.map((card) => {
        const raw   = card.getValue(kpis) ?? 0;
        const value = card.transform ? card.transform(raw) : raw;

        return (
          <div key={card.key} style={styles.card}>
            <div style={styles.accentBar(card.accent)} />
            <div style={styles.content}>
              <div style={styles.label}>{card.label}</div>
              <div style={styles.value}>
                {typeof value === "number"
                  ? value.toLocaleString()
                  : value}
                <span style={styles.suffix}>{card.suffix}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}