import datetime as dt
from scripts.uccle.derive import annual_means, baseline_mean, anomalies

def recs_for(year, n, tmean):
    out = []
    for i in range(n):
        d = dt.date(year, 1, 1) + dt.timedelta(days=i)
        out.append({"date": d, "tmax": tmean + 5, "tmin": tmean - 5, "tmean": tmean})
    return out

def test_annual_mean_and_coverage_gate():
    full = recs_for(2000, 365, 10.0)
    short = recs_for(2001, 100, 20.0)
    am = annual_means(full + short)
    assert am[0] == {"year": 2000, "mean": 10.0, "tmin": 5.0, "tmax": 15.0, "incomplete": False}
    assert am[1]["incomplete"] is True

def test_baseline_and_anomaly_excludes_incomplete():
    am = annual_means(recs_for(2000, 365, 10.0) + recs_for(2001, 365, 12.0) + recs_for(2002, 100, 99.0))
    base = baseline_mean(am, 2000, 2002)     # 2002 excluded (incomplete)
    assert base == 11.0
    an = anomalies(am, base)
    assert {"year": 2000, "v": -1.0} in an
