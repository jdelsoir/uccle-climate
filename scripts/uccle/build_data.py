import json, os, urllib.request, datetime as dt
from .parser import parse_dly, daily_records
from . import derive

STATION = "BE000006447"
DLY_URL = f"https://www.ncei.noaa.gov/pub/data/ghcn/daily/all/{STATION}.dly"
BASELINES = {"1991-2020": (1991, 2020), "1961-1990": (1961, 1990)}

# Open-Meteo ERA5 archive — fills GHCN gaps (Uccle TMIN is sparse 2000-2024).
ARCHIVE_URL = (
    "https://archive-api.open-meteo.com/v1/archive?latitude=50.8&longitude=4.36"
    "&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Brussels"
    "&start_date={start}&end_date={end}"
)
ARCHIVE_START = "1940-01-01"  # ERA5 begins 1940; GHCN-only keeps deep history pre-1940

# Open-Meteo forecast past_days — recent-days fill (covers the gap before ERA5 finalizes).
RECENT_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=4.36"
    "&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Brussels"
    "&past_days={days}&forecast_days=1"
)


def merge_fills(recs, archive=None, recent=None, today=None, lag=5):
    """GHCN records are authoritative; fill remaining dates from ERA5 archive,
    then from the forecast `recent` dict. Precedence: GHCN > archive > recent.

    With `today` set: drop any fill date >= today (the live app owns today), and
    tag a filled day `provisional=True` when date >= today - lag (ERA5 lag window).
    GHCN days are never provisional.
    """
    have = {r["date"] for r in recs}
    merged = list(recs)
    fills = {}
    for src in (archive or {}, recent or {}):       # archive first → wins ties
        for d, v in src.items():
            if d in have or d in fills:
                continue
            if today is not None and d >= today:    # cutoff: only up to yesterday
                continue
            tmax, tmin = v.get("tmax"), v.get("tmin")
            if tmax is None or tmin is None:
                continue
            entry = {"date": d, "tmax": tmax, "tmin": tmin, "tmean": (tmax + tmin) / 2}
            if today is not None and d >= today - dt.timedelta(days=lag):
                entry["provisional"] = True
            fills[d] = entry
    merged.extend(fills.values())
    merged.sort(key=lambda r: r["date"])
    return merged


def fetch_archive(start, end):
    """Fetch Open-Meteo ERA5 daily max/min into {date: {tmax, tmin}}."""
    url = ARCHIVE_URL.format(start=start, end=end)
    with urllib.request.urlopen(url, timeout=180) as resp:
        j = json.loads(resp.read())
    daily = j["daily"]
    out = {}
    for i, dstr in enumerate(daily["time"]):
        out[dt.date.fromisoformat(dstr)] = {
            "tmax": daily["temperature_2m_max"][i],
            "tmin": daily["temperature_2m_min"][i],
        }
    return out


def fetch_recent(days=7):
    """Fetch Open-Meteo forecast recent days into {date: {tmax, tmin}}."""
    url = RECENT_URL.format(days=days)
    with urllib.request.urlopen(url, timeout=60) as resp:
        j = json.loads(resp.read())
    daily = j["daily"]
    out = {}
    for i, dstr in enumerate(daily["time"]):
        out[dt.date.fromisoformat(dstr)] = {
            "tmax": daily["temperature_2m_max"][i],
            "tmin": daily["temperature_2m_min"][i],
        }
    return out


def build(text=None, records=None, archive=None, recent=None, today=None, out_dir="public/data"):
    recs = records if records is not None else daily_records(parse_dly(text))
    if not recs:
        raise SystemExit("No records parsed — aborting (format drift?)")
    if archive or recent:
        recs = merge_fills(recs, archive, recent, today)
    annual = derive.annual_means(recs)
    per_date = derive.per_date(recs)
    latest_year = max(a["year"] for a in annual)
    records = {
        "year": latest_year,
        "highs": sum(1 for v in per_date.values() if v["recordHigh"]["year"] == latest_year),
        "lows": sum(1 for v in per_date.values() if v["recordLow"]["year"] == latest_year),
    }
    # Top-10 individual-day extremes across the whole record (date + value).
    extremes = {
        "warmest": [{"date": r["date"].isoformat(), "v": r["tmax"]}
                    for r in sorted(recs, key=lambda r: r["tmax"], reverse=True)[:10]],
        "coldest": [{"date": r["date"].isoformat(), "v": r["tmin"]}
                    for r in sorted(recs, key=lambda r: r["tmin"])[:10]],
    }
    bases = {}
    for k, (s, e) in BASELINES.items():
        try:
            bases[k] = derive.baseline_mean(annual, s, e)
        except ValueError:
            bases[k] = None
    anomaly = {k: (derive.anomalies(annual, bases[k]) if bases[k] is not None else [])
               for k in BASELINES}
    summary = {
        "station": {"id": STATION, "name": "Uccle", "lat": 50.8, "lon": 4.36},
        "baselines": bases,
        "annual": annual,
        "anomaly": anomaly,
        "decadal": derive.decadal_means(recs),
        "warmingRate": _safe_warming_rate(annual),
        "records": records,
        "extremes": extremes,
        "counters": {**derive.threshold_counters(recs),
                     "heatwaveDays": derive.heatwave_days(recs),
                     "gsl": derive.growing_season(recs)},
        "rankings": derive.rankings(annual),
    }
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(os.path.join(out_dir, "thisday"), exist_ok=True)
    _write(os.path.join(out_dir, "summary.json"), summary)
    _write(os.path.join(out_dir, "daynorm.json"),
           {k: derive.doy_normals(recs, *v) for k, v in BASELINES.items()})
    for mmdd, payload in per_date.items():
        _write(os.path.join(out_dir, "thisday", f"{mmdd}.json"), payload)
    os.makedirs(os.path.join(out_dir, "month"), exist_ok=True)
    for mmkey, payload in derive.month_data(recs).items():
        _write(os.path.join(out_dir, "month", f"{mmkey}.json"), payload)
    os.makedirs(os.path.join(out_dir, "daily"), exist_ok=True)
    for ykey, payload in derive.daily_data(recs).items():
        _write(os.path.join(out_dir, "daily", f"{ykey}.json"), payload)


def _safe_warming_rate(annual):
    try:
        last_year = max(a["year"] for a in annual if not a["incomplete"])
        return {
            "full": derive.ols_slope_per_decade(annual),
            "last30": derive.ols_slope_per_decade(annual, since=last_year - 29),
        }
    except (ValueError, StopIteration):
        return {"full": None, "last30": None}


def _write(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f, separators=(",", ":"))


def main():
    with urllib.request.urlopen(DLY_URL, timeout=120) as resp:
        text = resp.read().decode("utf-8", "replace")
    today = dt.date.today()
    end = (today - dt.timedelta(days=1)).isoformat()   # cutoff: live app owns today
    try:
        archive = fetch_archive(ARCHIVE_START, end)
        print(f"Fetched {len(archive)} archive days {ARCHIVE_START}..{end}")
    except Exception as e:  # best-effort enhancement; never fail the build on it
        archive = None
        print(f"WARNING: archive fetch failed ({e}); building without ERA5 fill")
    try:
        recent = fetch_recent()
        print(f"Fetched {len(recent)} recent forecast days")
    except Exception as e:  # best-effort; degrade to archive/GHCN only
        recent = None
        print(f"WARNING: recent fetch failed ({e}); building without forecast fill")
    build(text=text, archive=archive, recent=recent, today=today)
    print("Wrote public/data/")


if __name__ == "__main__":
    main()
