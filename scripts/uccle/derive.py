from collections import defaultdict

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
    sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxx = sum(x * x for x, _ in pts); sxy = sum(x * y for x, y in pts)
    slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    return round(slope * 10, 3)
