import json, os, urllib.request
from .parser import parse_dly, daily_records
from . import derive

STATION = "BE000006447"
DLY_URL = f"https://www.ncei.noaa.gov/pub/data/ghcn/daily/all/{STATION}.dly"
BASELINES = {"1991-2020": (1991, 2020), "1961-1990": (1961, 1990)}

def build(text=None, records=None, out_dir="public/data"):
    recs = records if records is not None else daily_records(parse_dly(text))
    if not recs:
        raise SystemExit("No records parsed — aborting (format drift?)")
    annual = derive.annual_means(recs)
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
    for mmdd, payload in derive.per_date(recs).items():
        _write(os.path.join(out_dir, "thisday", f"{mmdd}.json"), payload)

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
    build(text=text)
    print("Wrote public/data/")

if __name__ == "__main__":
    main()
