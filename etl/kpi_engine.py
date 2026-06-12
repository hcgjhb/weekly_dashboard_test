import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import ast
import matplotlib.ticker as ticker
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

df=pd.read_csv("parsed_data.csv")

global date_range
date_range=False

global start_date
start_date = None
global end_date
end_date = None

df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y')

# KPI 1: Total Outages
def total_outages(df):
    if date_range:
        df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]
    return df.shape[0]

# print("Total Outages:", total_outages(df))

# KPI 2: Average MTTR
def average_mttr(df):
    if date_range:
        df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]
    return df['MTTR in \nMints'].mean()

# print("Average MTTR:", average_mttr(df))

df['Customers'] = df['Customers'].apply(ast.literal_eval)


# KPI 3: Customers Impacted
def customers_impacted(df):
    if date_range:
        df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]
    customers=set()
    for i, row in df.iterrows():
        impacted=row['Customers']

        for customer in impacted:
            customers.add(customer)
    return len(customers)

# print("Customers Impacted:", customers_impacted(df))

# KPI 4: Total Downtime
def total_downtime(df):
    if date_range:
        df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]
    return df['MTTR in \nMints'].sum()

# print("Total Downtime:", total_downtime(df))

# Downtime trend
def plot_downtime_trend(df, week=None):
    df = df.copy()

    # ── Prepare columns ────────────────────────────────────────────────────────
    df['date']      = pd.to_datetime(df['date'], format='%d-%m-%Y')
    df['Down Time'] = pd.to_numeric(df['MTTR in \nMints'], errors='coerce').fillna(0)
    df['week']      = df['date'].dt.to_period('W').apply(lambda r: r.start_time)

    # ── Default to last week WITH data ─────────────────────────────────────────
    if week is None:
        latest_date = df['date'].max()
        week = df['week'][df['date'] == latest_date].values[0]

    df_week = df[df['week'] == week].sort_values('date')

    if df_week.empty:
        print(f"No data found for week starting {week}")
        return

    # ── Aggregate per day ──────────────────────────────────────────────────────
    daily = (
        df_week.groupby('date')
        .agg(downtime=('Down Time', 'sum'), outages=('Sr. No.', 'count'))
        .reset_index()
        .sort_values('date')
    )

    labels   = daily['date'].dt.strftime('%d %b').tolist()
    downtime = daily['downtime'].tolist()
    outages  = daily['outages'].tolist()
    x        = np.arange(len(labels))

    # ── Plot ───────────────────────────────────────────────────────────────────
    fig, ax1 = plt.subplots(figsize=(8, 4.5))
    fig.patch.set_facecolor('white')
    ax1.set_facecolor('white')

    # Bars → Downtime (Mins)
    ax1.bar(x, downtime, color='#6C63FF', width=0.55, zorder=2)
    ax1.set_ylabel('Downtime (Mins)', color='#444', fontsize=10)
    ax1.set_ylim(0, max(downtime) * 1.3 if downtime else 1)
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels, fontsize=9)
    ax1.tick_params(axis='y', labelcolor='#444')
    ax1.yaxis.set_major_locator(ticker.MaxNLocator(5, integer=True))
    ax1.grid(axis='y', linestyle='--', alpha=0.4, zorder=0)
    ax1.spines[['top', 'right']].set_visible(False)

    # Line → Outages
    ax2 = ax1.twinx()
    ax2.plot(x, outages, color='#00BFFF', marker='o',
             markerfacecolor='white', markeredgecolor='#00BFFF',
             markeredgewidth=2, markersize=7, linewidth=2, zorder=3)
    ax2.set_ylabel('Outages', color='#444', fontsize=10)
    ax2.set_ylim(0, max(outages) * 1.3 if outages else 1)
    ax2.yaxis.set_major_locator(ticker.MaxNLocator(5, integer=True))
    ax2.tick_params(axis='y', labelcolor='#444')
    ax2.spines[['top', 'left']].set_visible(False)

    # Legend
    legend_elements = [
        Patch(facecolor='#6C63FF', label='Downtime (Mins)'),
        Line2D([0], [0], color='#00BFFF', marker='o', markerfacecolor='white',
               markeredgecolor='#00BFFF', markeredgewidth=2, label='Outages'),
    ]
    ax1.legend(handles=legend_elements, loc='upper left', fontsize=9,
               frameon=False, ncol=2)

    # Title with week range
    week_start = pd.Timestamp(week)
    week_end   = week_start + pd.Timedelta(days=6)
    week_label = f"{week_start.strftime('%b %d')} – {week_end.strftime('%b %d, %Y')}"
    ax1.set_title(f'DOWNTIME TREND (MINUTES)  |  {week_label}',
                  fontweight='bold', fontsize=11, loc='left', pad=12)

    plt.tight_layout()
    plt.savefig('downtime_trend.png', dpi=150, bbox_inches='tight')
    plt.show()


# # Default — last week with data
# plot_downtime_trend(df)

# Fault type distribution
def plot_fault_type(df, start_date=None, end_date=None):
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y')

    # ── Filter by date range if provided ──────────────────────────────────────
    if start_date and end_date:
        df = df[(df['date'] >= pd.Timestamp(start_date)) & 
                (df['date'] <= pd.Timestamp(end_date))]

    # ── Aggregate ──────────────────────────────────────────────────────────────
    fault_counts = df['Fault Type'].value_counts()
    total        = fault_counts.sum()

    # Sort ascending so largest bar is on top
    fault_counts = fault_counts.sort_values(ascending=True)

    labels  = fault_counts.index.tolist()
    counts  = fault_counts.values.tolist()
    pcts    = [c / total * 100 for c in counts]

    # ── Plot ───────────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(8, 4))
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')

    bars = ax.barh(labels, pcts, color='#6C63FF', height=0.5, zorder=2)

    # Label each bar: count (pct%)
    for bar, count, pct in zip(bars, counts, pcts):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height() / 2,
                f'{count} ({pct:.1f}%)',
                va='center', ha='left', fontsize=9, color='#333')

    ax.set_xlim(0, 115)
    ax.set_xlabel('% of Total Outages', fontsize=10, color='#444')
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: f'{int(v)}%'))
    ax.set_xticks([0, 25, 50, 75, 100])
    ax.tick_params(axis='both', labelsize=9)
    ax.spines[['top', 'right', 'left']].set_visible(False)
    ax.grid(axis='x', linestyle='--', alpha=0.4, zorder=0)

    ax.set_title('FAULT TYPE CONTRIBUTION', fontweight='bold',
                 fontsize=11, loc='left', pad=12)

    plt.tight_layout()
    plt.savefig('fault_type_contribution.png', dpi=150, bbox_inches='tight')
    plt.show()


# All data
# plot_fault_type(df)


# Outages by Severity
def plot_outages_by_severity(df, start_date=None, end_date=None):
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'], format='%d-%m-%Y')

    if start_date and end_date:
        df = df[(df['date'] >= pd.Timestamp(start_date)) &
                (df['date'] <= pd.Timestamp(end_date))]

    order  = ['S1', 'S2', 'S3']
    severity_counts = df['Severity'].value_counts()
    counts = [severity_counts.get(s, 0) for s in order]
    total  = sum(counts)
    pcts   = [c / total * 100 for c in counts]
    colors = ['#EF4444', '#F97316', '#86EFAC']

    fig, ax = plt.subplots(figsize=(6, 4.5))
    fig.patch.set_facecolor('white')
    ax.set_facecolor('white')

    wedges, _ = ax.pie(
        counts,
        colors=colors,
        startangle=90,
        counterclock=False,
        wedgeprops=dict(width=0.55, edgecolor='white', linewidth=2),
    )

    # Centre text
    ax.text(0, 0.08, str(total), ha='center', va='center',
            fontsize=26, fontweight='bold', color='#0f172a')
    ax.text(0, -0.18, 'Total', ha='center', va='center',
            fontsize=11, color='#64748b')

    # ── Clean legend with count + pct ─────────────────────────────────────────
    legend_labels = [
        f'S1 Critical\n{counts[0]} ({pcts[0]:.1f}%)',
        f'S2 Major\n{counts[1]} ({pcts[1]:.1f}%)',
        f'S3 Minor\n{counts[2]} ({pcts[2]:.1f}%)',
    ]
    legend = ax.legend(
        wedges,
        legend_labels,
        loc='center left',
        bbox_to_anchor=(0.95, 0.5),
        frameon=False,
        fontsize=9,
        labelspacing=1.2,
        handlelength=1.2,
        handleheight=1.2,
    )

    ax.set_title('OUTAGES BY SEVERITY', fontweight='bold',
                 fontsize=11, loc='left', pad=12)

    plt.tight_layout()
    plt.savefig('outages_by_severity.png', dpi=150, bbox_inches='tight')
    plt.show()


# All data
# plot_outages_by_severity(df)

# # Filtered by date range
# plot_outages_by_severity(df, start_date='2026-01-01', end_date='2026-03-31')

def customer_risk_ranking(df, top_n=10):
 
    df = df.copy()
 
    # -----------------------------
    # Parse customer list
    # -----------------------------
    if isinstance(df['Customers'].iloc[0], str):
        df['Customers'] = df['Customers'].apply(ast.literal_eval)
 
    # -----------------------------
    # Numeric MTTR
    # -----------------------------
    df['MTTR_Minutes'] = pd.to_numeric(
        df['MTTR in \nMints'],
        errors='coerce'
    ).fillna(0)
 
    # -----------------------------
    # Severity weights
    # -----------------------------
    severity_weights = {
        'S1': 5,
        'S2': 3,
        'S3': 1
    }
 
    df['severity_score'] = (
        df['Severity']
        .map(severity_weights)
        .fillna(1)
    )
 
    # -----------------------------
    # One row per customer
    # -----------------------------
    customer_df = df.explode('Customers')
    customer_df.rename(
        columns={'Customers': 'Customer'},
        inplace=True
    )
 
    # -----------------------------
    # Aggregate metrics
    # -----------------------------
    summary = (
        customer_df.groupby('Customer')
        .agg(
            outages=('Sr. No.', 'count'),
            downtime_mins=('MTTR_Minutes', 'sum'),
            avg_mttr=('MTTR_Minutes', 'mean'),
            severity_score=('severity_score', 'sum')
        )
        .reset_index()
    )
 
    summary['downtime_hrs'] = (
        summary['downtime_mins'] / 60
    ).round(1)
 
    summary['avg_mttr'] = (
        summary['avg_mttr']
    ).round(1)
 
    # -----------------------------
    # Risk Score
    # -----------------------------
    summary['risk_score'] = (
        0.35 * (summary['outages'] / summary['outages'].max()) +
        0.30 * (summary['downtime_mins'] / summary['downtime_mins'].max()) +
        0.15 * (summary['avg_mttr'] / summary['avg_mttr'].max()) +
        0.20 * (summary['severity_score'] / summary['severity_score'].max())
    )
 
    # -----------------------------
    # Risk Level
    # -----------------------------
    summary['risk_level'] = np.select(
        [
            summary['risk_score'] >= 0.70,
            summary['risk_score'] >= 0.40
        ],
        [
            'High',
            'Watchlist'
        ],
        default='Healthy'
    )
 
    # -----------------------------
    # Sort
    # -----------------------------
    risk_order = {
        'High': 0,
        'Watchlist': 1,
        'Healthy': 2
    }
 
    summary['risk_order'] = (
        summary['risk_level']
        .map(risk_order)
    )
 
    summary = summary.sort_values(
        ['risk_order', 'risk_score'],
        ascending=[True, False]
    )
 
    summary = summary[
        [
            'Customer',
            'outages',
            'downtime_hrs',
            'avg_mttr',
            'risk_level'
        ]
    ]
 
    summary.columns = [
        'Customer',
        'Outages',
        'Downtime (Hrs)',
        'Avg MTTR (Min)',
        'Risk Level'
    ]
 
    return summary.head(top_n)