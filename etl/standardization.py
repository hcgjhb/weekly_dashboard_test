import re
import sys
import logging
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from rapidfuzz import process, fuzz

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
DEFAULT_INPUT  = "SA_Outage_till_may 26.xlsx"
DEFAULT_OUTPUT = "parsed_data.csv"
FUZZY_THRESHOLD = 85

COMPANIES = [
    "Airtel", "Akamai", "Amazon", "Amazon LEO", "Apple",
    "Bloomberg", "Citadel", "Cloudflare", "Colt", "Edgerede", "Flipkart",
    "Google", "HGC", "IDFC", "Jump Traders", "Kuiper",
    "Meta", "Microsoft", "Netflix", "Netmagic", "NTT", "NVIDIA", "Oracle",
    "PhonePe", "Riot Games", "Sify", "TCL", "Telstra", "Verizon",
    "Vodafone", "Wells Fargo", "Zenlayer", "Zoho",
]

# ---------------------------------------------------------------------------
# Fuzzy company extraction
# ---------------------------------------------------------------------------

def is_noise_token(token: str) -> bool:
    """Return True for numeric codes, port specs, and location codes."""
    digit_ratio = sum(c.isdigit() for c in token) / max(len(token), 1)
    if digit_ratio > 0.5:
        return True
    # Alphanumeric codes with digits: MAA026, 100G, DEL3
    if re.fullmatch(r"[A-Z0-9]{2,}", token) and any(c.isdigit() for c in token):
        return True
    return False


def normalize(text: str) -> str:
    """Lowercase and strip spaces for space-insensitive matching."""
    return text.lower().replace(" ", "")


def extract_companies(
    customer_text: str,
    company_list: list[str],
    threshold: int = FUZZY_THRESHOLD,
) -> list[str]:
    """
    Parse free-text customer names and return a sorted list of matched
    company names from company_list using two-pass fuzzy matching.

    Pass 1 — lowercase with spaces  : catches 'meta' → 'Meta'
    Pass 2 — space-stripped          : catches 'Phone Pe' → 'PhonePe'
    """
    if not isinstance(customer_text, str):
        return []

    # Split on delimiters (including hyphen)
    delimiter_tokens = re.split(r"[\n,:()[\]*\\-]+", customer_text)
    delimiter_tokens = [t.strip() for t in delimiter_tokens if t.strip()]

    # Further split on whitespace
    words: list[str] = []
    for token in delimiter_tokens:
        words.extend(token.split())

    # Drop noise tokens
    clean_words = [w for w in words if not is_noise_token(w)]

    # Build 1-, 2-, and 3-word candidates
    candidates: set[str] = set(clean_words)
    for n in (2, 3):
        for i in range(len(clean_words) - n + 1):
            candidates.add(" ".join(clean_words[i : i + n]))

    # Lookup maps
    company_lower_map   = {c.lower(): c for c in company_list}
    company_lower_list  = list(company_lower_map.keys())
    company_nospace_map  = {normalize(c): c for c in company_list}
    company_nospace_list = list(company_nospace_map.keys())

    matches: set[str] = set()
    for candidate in candidates:
        # Pass 1
        result = process.extractOne(
            candidate.lower(),
            company_lower_list,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=threshold,
        )
        if result:
            matches.add(company_lower_map[result[0]])
            continue

        # Pass 2
        result = process.extractOne(
            normalize(candidate),
            company_nospace_list,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=threshold,
        )
        if result:
            matches.add(company_nospace_map[result[0]])

    return sorted(matches)


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def load_excel(path: str | Path) -> pd.DataFrame:
    path = Path(path)
    if not path.exists():
        log.error("Input file not found: %s", path)
        sys.exit(1)
    log.info("Loading Excel: %s", path)
    df = pd.read_excel(path)
    log.info("Loaded %d rows × %d columns", *df.shape)
    return df


def extract_customer_column(df: pd.DataFrame) -> pd.DataFrame:
    log.info("Extracting company names from 'Customer Name' column ...")
    df["Customers"] = df["Customer Name"].apply(
        lambda x: extract_companies(x, COMPANIES)
    )
    empty_count = df["Customers"].apply(lambda x: x == []).sum()
    log.info("  Rows with no matched company: %d", empty_count)
    return df


def drop_bad_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Drop rows where Customer Name is a bare number (e.g. '4')."""
    mask = df["Customer Name"].astype(str).str.fullmatch(r"\d+")
    dropped = mask.sum()
    if dropped:
        log.info("Dropping %d row(s) with numeric-only Customer Name", dropped)
        df = df[~mask].reset_index(drop=True)
    return df


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    log.info("Parsing date column from 'Down Time' ...")

    # Down Time may already be datetime (Excel reads it that way)
    if not pd.api.types.is_datetime64_any_dtype(df["Down Time"]):
        df["Down Time"] = pd.to_datetime(df["Down Time"], dayfirst=True, errors="coerce")

    df["date"] = df["Down Time"].dt.normalize()

    na_dates = df["date"].isna().sum()
    if na_dates:
        log.warning("  %d row(s) have unparseable dates — 'date' will be NaT", na_dates)
    else:
        log.info("  All dates parsed successfully")

    return df


def save_csv(df: pd.DataFrame, path: str | Path) -> None:
    path = Path(path)
    df.to_csv(path, index=False)
    log.info("Saved %d rows to %s", len(df), path)


def run(input_path: str, output_path: str) -> pd.DataFrame:
    df = load_excel(input_path)
    df = extract_customer_column(df)
    df = drop_bad_rows(df)
    df = parse_dates(df)
    save_csv(df, output_path)
    log.info("Standardization complete.")
    return df


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Standardize outage Excel file → parsed_data.csv"
    )
    parser.add_argument(
        "--input", "-i",
        default=DEFAULT_INPUT,
        help=f"Path to input Excel file (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output", "-o",
        default=DEFAULT_OUTPUT,
        help=f"Path to output CSV file (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(args.input, args.output)