/**
 * useOutageData.js
 * ─────────────────
 * Loads all 6 JSON files from /data/ and exposes filtered slices
 * based on the active dateRange selection.
 *
 * Date filtering mirrors the kpi_engine.py global date_range logic —
 * but done client-side so the JSON files stay static.
 */

import { useState, useEffect, useMemo } from "react";

const DATA_BASE = process.env.PUBLIC_URL + "/data";

const FILES = [
  "meta.json",
  "kpis.json",
  "downtime_trend.json",
  "fault_types.json",
  "severity.json",
  "risk_ranking.json",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inRange(dateStr, start, end) {
  if (!start && !end) return true;
  const d = new Date(dateStr);
  if (start && d < new Date(start)) return false;
  if (end   && d > new Date(end))   return false;
  return true;
}

// Re-compute KPI cards from raw trend data after date filter
function computeKpis(trend, riskRanking, dateRange) {
  const { start, end } = dateRange;

  // Filter daily rows within date range
  const filteredDays = trend.flatMap((w) =>
    w.days.filter((d) => inRange(d.date, start, end))
  );

  const totalOutages      = filteredDays.reduce((s, d) => s + d.outages, 0);
  const totalDowntimeMins = filteredDays.reduce((s, d) => s + d.downtime_mins, 0);
  const avgMttr           = totalOutages > 0
    ? parseFloat((totalDowntimeMins / totalOutages).toFixed(1))
    : 0;

  // customers_impacted: count unique customers in risk ranking
  // (risk_ranking is pre-aggregated over all time; for date-filtered
  //  customer count we use the full list length as an approximation
  //  since per-day customer data isn't stored in trend JSON)
  const customersImpacted = riskRanking.length;

  return { totalOutages, avgMttr, customersImpacted, totalDowntimeMins };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOutageData() {
  const [raw, setRaw]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Date filter state — null means "all time"
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Load all JSON files once on mount
  useEffect(() => {
    const fetches = FILES.map((f) =>
      fetch(`${DATA_BASE}/${f}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${f}: ${r.status}`);
        return r.json();
      })
    );

    Promise.all(fetches)
      .then(([meta, kpis, trend, faultTypes, severity, riskRanking]) => {
        setRaw({ meta, kpis, trend, faultTypes, severity, riskRanking });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // ── Derived / filtered data ──────────────────────────────────────────────────
  const data = useMemo(() => {
    if (!raw) return null;
    const { start, end } = dateRange;
    const hasFilter = !!(start || end);

    // Downtime trend — filter weeks that have at least one day in range,
    // and filter the days array within each week
    const trend = raw.trend.map((week) => ({
      ...week,
      days: week.days.filter((d) => inRange(d.date, start, end)),
    })).filter((week) => week.days.length > 0);

    // Find the "latest" week in filtered set (last entry)
    const latestWeek = trend.length > 0 ? trend[trend.length - 1] : null;

    // Fault types — filter from raw trend days then recount
    let faultTypes = raw.faultTypes;
    let severity   = raw.severity;
    let kpis       = raw.kpis;

    if (hasFilter) {
      // For fault/severity we re-derive from trend days (approximation —
      // exact recount requires per-row data; trend days carry outage count
      // but not fault breakdown, so we keep full-dataset charts when filtered
      // and note this in the UI)
      kpis = {
        ...computeKpis(raw.trend, raw.riskRanking, dateRange),
        totalDowntimeMins: computeKpis(raw.trend, raw.riskRanking, dateRange).totalDowntimeMins,
      };
    }

    return {
      meta:        raw.meta,
      kpis,
      trend,
      latestWeek,
      faultTypes,
      severity,
      riskRanking: raw.riskRanking,
      hasFilter,
    };
  }, [raw, dateRange]);

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    // Convenience: available date bounds from meta
    dateBounds: raw
      ? { min: raw.meta.date_min, max: raw.meta.date_max }
      : { min: null, max: null },
  };
}