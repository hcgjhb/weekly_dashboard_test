/**
 * FaultTypeBars.jsx
 * ──────────────────
 * Horizontal bar chart showing fault type contribution as % of total.
 * Sorted so the largest bar is on top (ascending data order, reversed render).
 * Mirrors kpi_engine plot_fault_type().
 */

import React from "react";
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
  ResponsiveContainer, LabelList,
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
  chartWrap: { flex: 1, minHeight: 0 },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background:   "var(--bg-subtle)",
      border:       "1px solid var(--bg-border)",
      borderRadius: "var(--radius-sm)",
      padding:      "8px 12px",
      fontSize:     "12px",
    }}>
      <p style={{ color: "var(--text-primary)", marginBottom: 4 }}>{d.fault_type}</p>
      <p style={{ color: "#6C63FF" }}>{d.count} outages ({d.pct}%)</p>
    </div>
  );
};

export default function FaultTypeBars({ faultTypes }) {
  if (!faultTypes?.length) return null;

  // Sort descending → recharts renders top-to-bottom, so highest is first
  const sorted = [...faultTypes].sort((a, b) => b.count - a.count);

  return (
    <div style={s.card}>
      <div style={s.title}>Fault Type Contribution</div>
      <div style={s.chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sorted}
            margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--bg-border)"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              axisLine={{ stroke: "var(--bg-border)" }}
              tickLine={false}
              ticks={[0, 25, 50, 75, 100]}
            />
            <YAxis
              type="category"
              dataKey="fault_type"
              width={110}
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(108,99,255,0.06)" }} />
            <Bar dataKey="pct" fill="#6C63FF" radius={[0, 3, 3, 0]} maxBarSize={22}>
              {sorted.map((entry, i) => (
                <Cell key={i} fill="#6C63FF" fillOpacity={1 - i * 0.06} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                formatter={(v, entry) => {
                  // find pct from sorted array by index — recharts passes value not index
                  const item = sorted.find((d) => d.count === v);
                  return item ? `${v} (${item.pct}%)` : v;
                }}
                style={{ fill: "var(--text-secondary)", fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}