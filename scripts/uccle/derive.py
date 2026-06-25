from collections import defaultdict
import datetime as dt

def annual_means(recs, min_days=330):
    by_year = defaultdict(list)
    for r in recs:
        by_year[r["date"].year].append(r)
    out = []
    for year in sorted(by_year):
        rs = by_year[year]; n = len(rs)
        out.append({
            "year": year,
            "mean": round(sum(r["tmean"] for r in rs) / n, 2),
            "tmin": round(sum(r["tmin"] for r in rs) / n, 2),
            "tmax": round(sum(r["tmax"] for r in rs) / n, 2),
            "incomplete": n < min_days,
        })
    return out

def baseline_mean(annual, start, end):
    vals = [a["mean"] for a in annual if start <= a["year"] <= end and not a["incomplete"]]
    if not vals:
        raise ValueError(f"No complete years in baseline range {start}-{end}")
    return round(sum(vals) / len(vals), 2)

def anomalies(annual, base):
    return [{"year": a["year"], "v": round(a["mean"] - base, 2)} for a in annual]

def decadal_means(recs):
    by_dec = defaultdict(list)
    for r in recs:
        by_dec[(r["date"].year // 10) * 10].append(r["tmean"])
    return [{"decade": dec, "mean": round(sum(v) / len(v), 2)} for dec, v in sorted(by_dec.items())]

def ols_slope_per_decade(annual, since=None):
    pts = [(a["year"], a["mean"]) for a in annual
           if not a["incomplete"] and (since is None or a["year"] >= since)]
    n = len(pts)
    if n < 2:
        raise ValueError(f"Need >=2 complete years for slope, got {n}")
    sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxx = sum(x * x for x, _ in pts); sxy = sum(x * y for x, y in pts)
    slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    return round(slope * 10, 3)

def percentile(sorted_vals, p):
    if not sorted_vals:
        return 0.0
    if len(sorted_vals) == 1:
        return float(sorted_vals[0])
    k = (len(sorted_vals) - 1) * (p / 100.0)
    lo = int(k); hi = min(lo + 1, len(sorted_vals) - 1)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (k - lo)

def doy_normals(recs, start, end, window=7):
    by_md = defaultdict(list)
    for r in recs:
        if start <= r["date"].year <= end:
            by_md[(r["date"].month, r["date"].day)].append(r["tmean"])
    out = []
    leap = dt.date(2000, 1, 1)            # leap year → 366 calendar slots
    for i in range(366):
        d0 = leap + dt.timedelta(days=i)
        vals = []
        for off in range(-window, window + 1):
            d2 = d0 + dt.timedelta(days=off)
            vals += by_md.get((d2.month, d2.day), [])
        s = sorted(vals)
        out.append({
            "doy": i + 1, "mmdd": f"{d0.month:02d}{d0.day:02d}",
            "normal": round(sum(vals) / len(vals), 2) if vals else None,
            "p10": round(percentile(s, 10), 2) if vals else None,
            "p90": round(percentile(s, 90), 2) if vals else None,
        })
    return out
