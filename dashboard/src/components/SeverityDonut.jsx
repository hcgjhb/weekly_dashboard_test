/**
 * SeverityDonut.jsx
 * ──────────────────
 * Donut chart: S1 Critical / S2 Major / S3 Minor.
 * Center text shows total count. Mirrors kpi_engine plot_outages_by_severity().
 */

import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const s = {
  card: {
    background:    "var(--bg-card)",
    borderRadius:  "var(--radius)",
    border:        "1px solid var(--bg-border)",
    padding:       "20px",
    height:        "100%",
    display:       "flex",
    flexDirection: "column",
  },
  title: {
    fontSize:      "11px",
    fontWeight:    700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color:         "var(--text-secondary)",
    marginBottom:  "16px",
  },
  chartWrap: { flex: 1, minHeight: 0, height: "220px", position: "relative" },
  centerLabel: {
    position:   "absolute",
    top:        "50%",
    left:       "50%",
    transform:  "translate(-50%, -50%)",
    textAlign:  "center",
    pointerEvents: "none",
  },
  centerValue: {
    fontFamily: "var(--font-mono)",
    fontSize:   "28px",
    fontWeight: 600,
    color:      "var(--text-primary)",
    lineHeight: 1,
  },
  centerSub: {
    fontSize: "11px",
    color:    "var(--text-muted)",
    marginTop:"4px",
  },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div style={{
      background:   "var(--bg-subtle)",
      border:       "1px solid var(--bg-border)",
      borderRadius: "var(--radius-sm)",
      padding:      "8px 12px",
      fontSize:     "12px",
    }}>
      <span style={{ color: p.color }}>{name}</span>
      <span style={{ color: "var(--text-primary)", marginLeft: 8 }}>
        {value} ({p.pct}%)
      </span>
    </div>
  );
};

const renderLegend = (props) => {
  const { payload } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 8 }}>
      {payload.map((entry) => (
        <div key={entry.value} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: 2,
            background: entry.color, flexShrink: 0,
          }} />
          <div>
            <span style={{ color: "var(--text-primary)", fontSize: 12 }}>
              {entry.value}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 6 }}>
              {entry.payload.count} ({entry.payload.pct}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function SeverityDonut({ severity }) {
  if (!severity?.length) return null;

  const total = severity.reduce((s, d) => s + d.count, 0);
  const data  = severity.map((d) => ({
    name:  d.label,
    value: d.count,
    color: d.color,
    pct:   d.pct,
    count: d.count,
  }));

  return (
    <div style={s.card}>
      <div style={s.title}>Outages by Severity</div>
      <div style={s.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="40%"
              cy="50%"
              innerRadius="52%"
              outerRadius="75%"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
              stroke="var(--bg-card)"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              content={renderLegend}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div style={s.centerLabel}>
          <div style={s.centerValue}>{total}</div>
          <div style={s.centerSub}>Total</div>
        </div>
      </div>
    </div>
  );
}