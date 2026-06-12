import ast
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEFAULT_INPUT      = "parsed_data.csv"
DEFAULT_OUTPUT_DIR = "data"

SEVERITY_COLORS = {
    "S1": "#EF4444",
    "S2": "#F97316",
    "S3": "#86EFAC",
}

SEVERITY_LABELS = {
    "S1": "S1 Critical",
    "S2": "S2 Major",
    "S3": "S3 Minor",
}

SEVERITY_WEIGHTS = {"S1": 5, "S2": 3, "S3": 1}

RISK_SCORE_WEIGHTS = {
    "outages":        0.35,
    "downtime_mins":  0.30,
    "avg_mttr":       0.15,
    "severity_score": 0.20,
}

# ---------------------------------------------------------------------------
# Load & prep
# ---------------------------------------------------------------------------

def load_data(csv_path: str | Path) -> pd.DataFrame:
    path = Path(csv_path)
    if not path.exists():
        log.error("Input file not found: %s", path)
        sys.exit(1)

    log.info("Loading: %s", path)
    df = pd.read_csv(path)

    # ── Date column ────────────────────────────────────────────────────────────
    # standardization.py writes dates as ISO strings (YYYY-MM-DD) or DD-MM-YYYY
    # Try both gracefully.
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")

    bad_dates = df["date"].isna().sum()
    if bad_dates:
        log.warning("  %d row(s) with unparseable dates dropped", bad_dates)
        df = df[df["date"].notna()].copy()

    # ── Filter future outliers (e.g. 2026-11-18 typo) ─────────────────────────
    today = pd.Timestamp(datetime.now(timezone.utc).date())
    future = (df["date"] > today).sum()
    if future:
        log.warning("  %d row(s) with future dates dropped", future)
        df = df[df["date"] <= today].copy()

    # ── Customers column ───────────────────────────────────────────────────────
    # May arrive as stringified list "['Meta', 'Google']" or real list
    if df["Customers"].dtype == object and isinstance(df["Customers"].iloc[0], str):
        df["Customers"] = df["Customers"].apply(ast.literal_eval)

    # ── MTTR column (has newline in name) ──────────────────────────────────────
    mttr_col = "MTTR in \nMints"
    df["mttr_mins"] = pd.to_numeric(df[mttr_col], errors="coerce").fillna(0)

    log.info("  %d rows loaded after cleaning", len(df))
    return df


# ---------------------------------------------------------------------------
# Individual JSON generators
# ---------------------------------------------------------------------------

def gen_meta(df: pd.DataFrame) -> dict:
    return {
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "date_min":     df["date"].min().strftime("%Y-%m-%d"),
        "date_max":     df["date"].max().strftime("%Y-%m-%d"),
        "total_rows":   len(df),
    }


def gen_kpis(df: pd.DataFrame) -> dict:
    """Top-level KPI cards — full dataset (React applies date filter client-side)."""
    all_customers: set[str] = set()
    for customers in df["Customers"]:
        all_customers.update(customers)

    return {
        "total_outages":       int(len(df)),
        "avg_mttr":            round(float(df["mttr_mins"].mean()), 1),
        "customers_impacted":  int(len(all_customers)),
        "total_downtime_mins": round(float(df["mttr_mins"].sum()), 1),
    }


def gen_downtime_trend(df: pd.DataFrame) -> list[dict]:
    """
    All weeks of data, each with daily breakdowns.
    Shape: [ { week_start, week_end, week_label, is_latest, days: [{date, label, downtime_mins, outages}] } ]

    React defaults to the entry where is_latest=true (mirrors kpi_engine default).
    """
    work = df.copy()
    work["week_start"] = work["date"].dt.to_period("W").apply(lambda p: p.start_time)

    # Identify latest week with actual data
    latest_date  = work["date"].max()
    latest_week  = work.loc[work["date"] == latest_date, "week_start"].iloc[0]

    weeks = sorted(work["week_start"].unique())
    result = []

    for week in weeks:
        week_ts  = pd.Timestamp(week)
        week_end = week_ts + pd.Timedelta(days=6)

        df_week = work[work["week_start"] == week].copy()

        daily = (
            df_week.groupby("date")
            .agg(
                downtime_mins=("mttr_mins", "sum"),
                outages=("Sr. No.", "count"),
            )
            .reset_index()
            .sort_values("date")
        )

        days = [
            {
                "date":          row["date"].strftime("%Y-%m-%d"),
                "label":         row["date"].strftime("%d %b"),
                "downtime_mins": round(float(row["downtime_mins"]), 1),
                "outages":       int(row["outages"]),
            }
            for _, row in daily.iterrows()
        ]

        result.append({
            "week_start": week_ts.strftime("%Y-%m-%d"),
            "week_end":   week_end.strftime("%Y-%m-%d"),
            "week_label": f"{week_ts.strftime('%b %d')} – {week_end.strftime('%b %d, %Y')}",
            "is_latest":  bool(week_ts == latest_week),
            "days":       days,
        })

    return result


def gen_fault_types(df: pd.DataFrame) -> list[dict]:
    """
    Shape: [ { fault_type, count, pct } ]  sorted descending by count.
    The horizontal bar chart in React sorts ascending visually (largest on top),
    so we store descending and let React reverse for rendering.
    """
    counts = df["Fault Type"].value_counts()
    total  = int(counts.sum())

    return [
        {
            "fault_type": str(fault),
            "count":      int(count),
            "pct":        round(count / total * 100, 1),
        }
        for fault, count in counts.items()
    ]


def gen_severity(df: pd.DataFrame) -> list[dict]:
    """
    Shape: [ { severity, label, count, pct, color } ] in S1→S2→S3 order.
    """
    order  = ["S1", "S2", "S3"]
    counts = df["Severity"].value_counts()
    total  = int(counts.sum())

    return [
        {
            "severity": sev,
            "label":    SEVERITY_LABELS.get(sev, sev),
            "count":    int(counts.get(sev, 0)),
            "pct":      round(counts.get(sev, 0) / total * 100, 1),
            "color":    SEVERITY_COLORS.get(sev, "#94a3b8"),
        }
        for sev in order
    ]


def gen_risk_ranking(df: pd.DataFrame, top_n: int = None) -> list[dict]:
    """
    Mirrors customer_risk_ranking() in kpi_engine.py exactly.
    Returns ALL customers by default (React can slice to top_n).

    Shape: [ { customer, outages, downtime_hrs, avg_mttr_min,
               risk_score, risk_level } ]
    """
    work = df.copy()

    work["severity_score"] = work["Severity"].map(SEVERITY_WEIGHTS).fillna(1)

    # One row per customer
    exploded = work.explode("Customers").rename(columns={"Customers": "Customer"})
    exploded = exploded[exploded["Customer"].notna() & (exploded["Customer"] != "")]

    summary = (
        exploded.groupby("Customer")
        .agg(
            outages=("Sr. No.", "count"),
            downtime_mins=("mttr_mins", "sum"),
            avg_mttr=("mttr_mins", "mean"),
            severity_score=("severity_score", "sum"),
        )
        .reset_index()
    )

    # Normalised risk score (same weights as kpi_engine)
    def safe_norm(col):
        max_val = col.max()
        return col / max_val if max_val > 0 else col * 0

    summary["risk_score"] = (
        RISK_SCORE_WEIGHTS["outages"]        * safe_norm(summary["outages"]) +
        RISK_SCORE_WEIGHTS["downtime_mins"]  * safe_norm(summary["downtime_mins"]) +
        RISK_SCORE_WEIGHTS["avg_mttr"]       * safe_norm(summary["avg_mttr"]) +
        RISK_SCORE_WEIGHTS["severity_score"] * safe_norm(summary["severity_score"])
    )

    # Risk level
    summary["risk_level"] = np.select(
        [summary["risk_score"] >= 0.70, summary["risk_score"] >= 0.40],
        ["High", "Watchlist"],
        default="Healthy",
    )

    # Sort: High → Watchlist → Healthy, then risk_score desc within tier
    risk_order = {"High": 0, "Watchlist": 1, "Healthy": 2}
    summary["_order"] = summary["risk_level"].map(risk_order)
    summary = summary.sort_values(["_order", "risk_score"], ascending=[True, False])

    if top_n:
        summary = summary.head(top_n)

    return [
        {
            "customer":       str(row["Customer"]),
            "outages":        int(row["outages"]),
            "downtime_hrs":   round(float(row["downtime_mins"]) / 60, 1),
            "avg_mttr_min":   round(float(row["avg_mttr"]), 1),
            "risk_score":     round(float(row["risk_score"]), 3),
            "risk_level":     str(row["risk_level"]),
        }
        for _, row in summary.iterrows()
    ]


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------

def write_json(data: dict | list, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    log.info("  Written → %s", path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(input_path: str, output_dir: str) -> None:
    out = Path(output_dir)
    df  = load_data(input_path)

    log.info("Generating JSONs into: %s/", out)

    write_json(gen_meta(df),              out / "meta.json")
    write_json(gen_kpis(df),              out / "kpis.json")
    write_json(gen_downtime_trend(df),    out / "downtime_trend.json")
    write_json(gen_fault_types(df),       out / "fault_types.json")
    write_json(gen_severity(df),          out / "severity.json")
    write_json(gen_risk_ranking(df),      out / "risk_ranking.json")

    log.info("Done. All 6 JSON files written.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate dashboard JSON files from parsed_data.csv"
    )
    parser.add_argument(
        "--input", "-i",
        default=DEFAULT_INPUT,
        help=f"Path to cleaned CSV (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output-dir", "-o",
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory for JSON files (default: {DEFAULT_OUTPUT_DIR})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(args.input, args.output_dir)