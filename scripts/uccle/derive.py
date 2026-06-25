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
