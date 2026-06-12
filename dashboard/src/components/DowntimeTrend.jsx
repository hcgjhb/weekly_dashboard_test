/**
 * DowntimeTrend.jsx
 * ──────────────────
 * Weekly downtime trend: bars = downtime (mins), line = outage count.
 * Dual Y-axis mirrors kpi_engine.py's plot_downtime_trend().
 * Week selector dropdown lets user switch between available weeks.
 */

import React, { useState, useEffect } from "react";
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  card: {
    background:   "var(--bg-card)",
    borderRadius: "var(--radius)",
    border:       "1px solid var(--bg-border)",
    padding:      "20px",
    height:       "100%",
    display:      "flex",
    flexDirection:"column",
  },
  header: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   "16px",
    gap:            "10px",
    flexWrap:       "wrap",
  },
  title: {
    fontSize:      "11px",
    fontWeight:    700,
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    color:         "var(--text-secondary)",
  },
  select: {
    background:   "var(--bg-subtle)",
    border:       "1px solid var(--bg-border)",
    borderRadius: "var(--radius-sm)",
    color:        "var(--text-primary)",
    fontSize:     "12px",
    padding:      "5px 10px",
    cursor:       "pointer",
    fontFamily:   "var(--font-body)",
    outline:      "none",
  },
  empty: {
    flex:           1,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    color:          "var(--text-muted)",
    fontSize:       "13px",
  },
  chartWrap: { flex: 1, minHeight: 0, height: "220px" },
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:   "var(--bg-subtle)",
      border:       "1px solid var(--bg-border)",
      borderRadius: "var(--radius-sm)",
      padding:      "10px 14px",
      fontSize:     "12px",
    }}>
      <p style={{ color: "var(--text-secondary)", marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DowntimeTrend({ trend }) {
  const [selectedWeek, setSelectedWeek] = useState(null);

  // Default to latest week on first load or when trend changes
  useEffect(() => {
    if (!trend?.length) return;
    const latest = trend.find((w) => w.is_latest) ?? trend[trend.length - 1];
    setSelectedWeek(latest.week_start);
  }, [trend]);

  if (!trend?.length) {
    return (
      <div style={s.card}>
        <div style={s.empty}>No trend data available</div>
      </div>
    );
  }

  const activeWeek = trend.find((w) => w.week_start === selectedWeek)
    ?? trend[trend.length - 1];

  const chartData = activeWeek?.days.map((d) => ({
    name:     d.label,
    Downtime: d.downtime_mins,
    Outages:  d.outages,
  })) ?? [];

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Downtime Trend</div>
          {activeWeek && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: 3 }}>
              {activeWeek.week_label}
            </div>
          )}
        </div>
        <select
          style={s.select}
          value={selectedWeek ?? ""}
          onChange={(e) => setSelectedWeek(e.target.value)}
        >
          {[...trend].reverse().map((w) => (
            <option key={w.week_start} value={w.week_start}>
              {w.week_label}{w.is_latest ? " (latest)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div style={s.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--bg-border)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={{ stroke: "var(--bg-border)" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Mins",
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 10,
                offset: 10,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Outages",
                angle: 90,
                position: "insideRight",
                fill: "var(--text-muted)",
                fontSize: 10,
                offset: 10,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }}
            />
            <Bar
              yAxisId="left"
              dataKey="Downtime"
              fill="#6C63FF"
              radius={[3, 3, 0, 0]}
              maxBarSize={48}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Outages"
              stroke="#00BFFF"
              strokeWidth={2}
              dot={{ fill: "var(--bg-card)", stroke: "#00BFFF", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}