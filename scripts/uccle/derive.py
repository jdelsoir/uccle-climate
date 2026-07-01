from collections import defaultdict
import datetime as dt
import calendar

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

def _window_mean(rs, lo, hi):
    vals = [r["tmean"] for r in rs if lo <= r["date"].year <= hi]
    return round(sum(vals) / len(vals), 2) if vals else None

def _per_year(recs):
    by = defaultdict(list)
    for r in recs:
        by[r["date"].year].append(r)
    return by

def threshold_counters(recs):
    by = _per_year(recs)
    res = {"SU": [], "hot30": [], "TR": [], "FD": [], "ID": []}
    for y in sorted(by):
        rs = by[y]
        res["SU"].append({"year": y, "n": sum(1 for r in rs if r["tmax"] >= 25)})
        res["hot30"].append({"year": y, "n": sum(1 for r in rs if r["tmax"] >= 30)})
        res["TR"].append({"year": y, "n": sum(1 for r in rs if r["tmin"] >= 20)})
        res["FD"].append({"year": y, "n": sum(1 for r in rs if r["tmin"] < 0)})
        res["ID"].append({"year": y, "n": sum(1 for r in rs if r["tmax"] < 0)})
    return res

def _flush_run(run):
    return len(run) if (len(run) >= 5 and sum(1 for r in run if r["tmax"] >= 30) >= 3) else 0

def heatwave_days(recs):
    by = _per_year(recs)
    out = []
    for y in sorted(by):
        days = {r["date"]: r for r in by[y]}
        ordered = sorted(days)
        total = 0
        run = []
        prev = None
        for d in ordered:
            r = days[d]
            consecutive = prev is not None and (d - prev).days == 1
            if r["tmax"] >= 25 and (not run or consecutive):
                run.append(r)
            else:
                total += _flush_run(run)
                run = [r] if r["tmax"] >= 25 else []
            prev = d
        total += _flush_run(run)
        out.append({"year": y, "n": total})
    return out

def _first_run(seq, cond, after_doy=0):
    streak = 0
    for d, t in seq:
        doy = d.timetuple().tm_yday
        if doy < after_doy:
            streak = 0
            continue
        streak = streak + 1 if cond(t) else 0
        if streak >= 6:
            return d - dt.timedelta(days=5)
    return None

def growing_season(recs):
    by = _per_year(recs)
    out = []
    for y in sorted(by):
        rs = sorted(by[y], key=lambda r: r["date"])
        means = [(r["date"], r["tmean"]) for r in rs]
        start = _first_run(means, lambda t: t > 5)
        end = _first_run(means, lambda t: t < 5, after_doy=182)
        n = (end - start).days if (start and end and end > start) else 0
        out.append({"year": y, "n": n})
    return out

def rankings(annual):
    valid = [{"year": a["year"], "mean": a["mean"]} for a in annual if not a["incomplete"]]
    warmest = sorted(valid, key=lambda a: a["mean"], reverse=True)
    coldest = sorted(valid, key=lambda a: a["mean"])
    return {"warmest": warmest, "coldest": coldest}

def _series_entry(r):
    e = {"year": r["date"].year, "tmax": r["tmax"], "tmin": r["tmin"]}
    if r.get("provisional"):
        e["provisional"] = True
    return e

def per_date(recs, early=(1833, 1900), recent=(1996, 2025)):
    by_md = defaultdict(list)
    for r in recs:
        by_md[(r["date"].month, r["date"].day)].append(r)
    out = {}
    for (m, d), rs in by_md.items():
        rs = sorted(rs, key=lambda r: r["date"].year)
        hi = max(rs, key=lambda r: r["tmax"]); lo = min(rs, key=lambda r: r["tmin"])
        out[f"{m:02d}{d:02d}"] = {
            "mmdd": f"{m:02d}{d:02d}",
            "recordHigh": {"v": hi["tmax"], "year": hi["date"].year},
            "recordLow": {"v": lo["tmin"], "year": lo["date"].year},
            "series": [_series_entry(r) for r in rs],
            "thenNow": {
                "early": {"from": early[0], "to": early[1], "mean": _window_mean(rs, *early)},
                "recent": {"from": recent[0], "to": recent[1], "mean": _window_mean(rs, *recent)},
            },
        }
    return out

def monthly_means(recs):
    by = defaultdict(list)
    for r in recs:
        by[(r["date"].year, r["date"].month)].append(r)
    out = {}
    for (y, m), rs in by.items():
        dim = calendar.monthrange(y, m)[1]
        n = len(rs)
        out[(y, m)] = {
            "mean": round(sum(r["tmean"] for r in rs) / n, 2),
            "meanMax": round(sum(r["tmax"] for r in rs) / n, 2),
            "meanMin": round(sum(r["tmin"] for r in rs) / n, 2),
            "n": n,
            "complete": n >= dim - 3,
        }
    return out

def month_data(recs, baseline=(1991, 2020), early=(1833, 1900), recent=(1996, 2025)):
    mm = monthly_means(recs)
    by_month = defaultdict(list)               # month -> [(year, info)]
    for (y, m), info in mm.items():
        by_month[m].append((y, info))
    out = {}
    for m in range(1, 13):
        entries = sorted(by_month.get(m, []), key=lambda t: t[0])
        series = [{"year": y, "mean": info["mean"], "meanMax": info["meanMax"], "meanMin": info["meanMin"], "complete": info["complete"]} for y, info in entries]
        complete = [(y, info["mean"]) for y, info in entries if info["complete"]]
        warm = max(complete, key=lambda t: t[1]) if complete else None
        cold = min(complete, key=lambda t: t[1]) if complete else None
        base_vals = [v for y, v in complete if baseline[0] <= y <= baseline[1]]
        early_vals = [v for y, v in complete if early[0] <= y <= early[1]]
        recent_vals = [v for y, v in complete if recent[0] <= y <= recent[1]]
        out[f"{m:02d}"] = {
            "mm": f"{m:02d}",
            "series": series,
            "recordWarm": {"year": warm[0], "v": warm[1]} if warm else None,
            "recordCold": {"year": cold[0], "v": cold[1]} if cold else None,
            "normal": round(sum(base_vals) / len(base_vals), 2) if base_vals else None,
            "thenNow": {
                "early": {"from": early[0], "to": early[1], "mean": round(sum(early_vals) / len(early_vals), 2) if early_vals else None},
                "recent": {"from": recent[0], "to": recent[1], "mean": round(sum(recent_vals) / len(recent_vals), 2) if recent_vals else None},
            },
        }
    return out

def daily_data(recs):
    by_md = defaultdict(list)
    for r in recs:
        by_md[(r["date"].month, r["date"].day)].append(r)
    rec_hi, rec_lo = {}, {}
    for md, rs in by_md.items():
        rec_hi[md] = max(rs, key=lambda r: r["tmax"])["date"].year
        rec_lo[md] = min(rs, key=lambda r: r["tmin"])["date"].year
    by_year = defaultdict(list)
    for r in recs:
        by_year[r["date"].year].append(r)
    out = {}
    for y in sorted(by_year):
        arr = []
        for r in sorted(by_year[y], key=lambda r: r["date"]):
            md = (r["date"].month, r["date"].day)
            e = {"mmdd": f"{md[0]:02d}{md[1]:02d}", "tmax": r["tmax"], "tmin": r["tmin"]}
            if r.get("provisional"):
                e["provisional"] = True
            else:
                if rec_hi[md] == y:
                    e["recHi"] = True
                if rec_lo[md] == y:
                    e["recLo"] = True
            arr.append(e)
        out[f"{y:04d}"] = arr
    return out
