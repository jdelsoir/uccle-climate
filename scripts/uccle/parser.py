import datetime as dt

def parse_dly(text):
    """GHCN-Daily .dly → {(year,month,day): {element: celsius}} for TMAX/TMIN."""
    out = {}
    for line in text.splitlines():
        if len(line) < 21:
            continue
        element = line[17:21]
        if element not in ("TMAX", "TMIN"):
            continue
        year = int(line[11:15]); month = int(line[15:17])
        for d in range(31):
            base = 21 + d * 8
            field = line[base:base + 8]
            if len(field) < 8:
                break
            try:
                value = int(field[0:5])
            except ValueError:
                continue
            if value == -9999:
                continue
            qflag = field[6:7]
            if qflag.strip():           # failed a QC check → drop
                continue
            out.setdefault((year, month, d + 1), {})[element] = value / 10.0
    return out

def daily_records(parsed):
    """Paired days only → sorted list of {date, tmax, tmin, tmean}."""
    recs = []
    for (y, m, d), vals in parsed.items():
        tmax, tmin = vals.get("TMAX"), vals.get("TMIN")
        if tmax is None or tmin is None:
            continue
        try:
            date = dt.date(y, m, d)
        except ValueError:
            continue                    # guards day 29-31 of short months
        recs.append({"date": date, "tmax": tmax, "tmin": tmin, "tmean": (tmax + tmin) / 2})
    recs.sort(key=lambda r: r["date"])
    return recs
