import datetime as dt
import pytest
from scripts.uccle.derive import annual_means, baseline_mean, anomalies, decadal_means, ols_slope_per_decade, percentile, doy_normals, per_date, threshold_counters, heatwave_days, growing_season, rankings, monthly_means, daily_data

def day(y, m, d, tmax, tmin):
    return {"date": dt.date(y, m, d), "tmax": tmax, "tmin": tmin, "tmean": (tmax + tmin) / 2}


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

def test_baseline_mean_empty_range_raises():
    am = [{"year": 2000, "mean": 10.0, "tmin": 0, "tmax": 0, "incomplete": True}]
    with pytest.raises(ValueError):
        baseline_mean(am, 1991, 2020)

def test_decadal_means():
    recs = recs_for(2000, 10, 10.0) + recs_for(2011, 10, 12.0)
    dm = decadal_means(recs)
    assert {"decade": 2000, "mean": 10.0} in dm
    assert {"decade": 2010, "mean": 12.0} in dm

def test_ols_slope_per_decade():
    # +0.1 °C per year → 1.0 °C per decade
    am = []
    for i, y in enumerate(range(2000, 2010)):
        am.append({"year": y, "mean": 10.0 + 0.1 * i, "tmin": 0, "tmax": 0, "incomplete": False})
    assert ols_slope_per_decade(am) == 1.0

def test_ols_slope_too_few_points_raises():
    am = [{"year": 2000, "mean": 10.0, "tmin": 0, "tmax": 0, "incomplete": False}]
    with pytest.raises(ValueError):
        ols_slope_per_decade(am)

def test_percentile_linear():
    assert percentile([0, 10], 50) == 5.0
    assert percentile([0, 10], 10) == 1.0

def test_doy_normals_length_and_value():
    # constant 10° everywhere → every normal 10, 366 entries (leap calendar)
    recs = recs_for(1991, 365, 10.0)
    for y in range(1992, 2021):
        recs += recs_for(y, 365, 10.0)
    dn = doy_normals(recs, 1991, 2020, window=7)
    assert len(dn) == 366
    assert dn[0]["mmdd"] == "0101" and dn[0]["normal"] == 10.0

def test_per_date_records_and_series():
    recs = [
        {"date": dt.date(1850,6,25), "tmax": 24.0, "tmin": 12.0, "tmean": 18.0},
        {"date": dt.date(2020,6,25), "tmax": 30.0, "tmin": 18.0, "tmean": 24.0},
    ]
    pd = per_date(recs, early=(1833,1900), recent=(1996,2025))
    d = pd["0625"]
    assert d["recordHigh"] == {"v": 30.0, "year": 2020}
    assert d["recordLow"] == {"v": 12.0, "year": 1850}
    assert d["series"][0] == {"year": 1850, "tmax": 24.0, "tmin": 12.0}
    assert d["thenNow"]["early"]["mean"] == 18.0
    assert d["thenNow"]["recent"]["mean"] == 24.0


def test_threshold_counters():
    recs = [day(2000, 7, 1, 26, 15), day(2000, 7, 2, 31, 21), day(2000, 1, 1, -2, -5), day(2000, 1, 2, 3, 1)]
    c = threshold_counters(recs)
    assert dict(year=2000, n=2) in c["SU"]      # 26 and 31 ≥25
    assert dict(year=2000, n=1) in c["hot30"]   # 31 ≥30
    assert dict(year=2000, n=1) in c["TR"]      # tmin 21 ≥20
    # FD: only tmin=-5 is <0; tmin=1 is NOT <0 → n=1
    assert [x for x in c["FD"] if x["year"] == 2000][0]["n"] == 1
    assert [x for x in c["ID"] if x["year"] == 2000][0]["n"] == 1   # tmax -2 <0


def test_heatwave_rmi_rule():
    # 5 consecutive ≥25 incl 3 ≥30 → qualifies (5 days)
    recs = [day(2000, 7, i, 30 if i <= 3 else 26, 18) for i in range(1, 6)]
    assert heatwave_days(recs) == [{"year": 2000, "n": 5}]
    # only 4 days → no heatwave
    recs2 = [day(2001, 7, i, 31, 18) for i in range(1, 5)]
    assert heatwave_days(recs2) == [{"year": 2001, "n": 0}]
    # 5-day run with ZERO days ≥30 → must NOT qualify (fails ≥3-hot-days criterion)
    recs3 = [day(2002, 7, i, 26, 18) for i in range(1, 6)]
    assert heatwave_days(recs3) == [{"year": 2002, "n": 0}]
    # Two qualifying 5-day runs separated by gap → days accumulate (5+5=10)
    runA = [day(2003, 7, i, 31, 18) for i in range(1, 6)]
    runB = [day(2003, 8, i, 31, 18) for i in range(1, 6)]
    assert heatwave_days(runA + runB) == [{"year": 2003, "n": 10}]


def test_rankings():
    am = [{"year": 2000, "mean": 10.0, "incomplete": False}, {"year": 2001, "mean": 12.0, "incomplete": False}]
    r = rankings(am)
    assert r["warmest"][0] == {"year": 2001, "mean": 12.0}
    assert r["coldest"][0] == {"year": 2000, "mean": 10.0}


def test_growing_season():
    # Build a year where:
    # - first 6-day warm run (Tmean>5) starts Jan 1 (days 1-6)
    # - first 6-day cold run (Tmean<5) after doy>=182 starts on day 182 (Jul 1)
    # GSL = (day 182) - (day 1) = 181 days
    recs = []
    year = 2000
    start = dt.date(year, 1, 1)
    for i in range(365):
        d = start + dt.timedelta(days=i)
        doy = d.timetuple().tm_yday
        # Warm before day 182 (tmean=10), cold from day 182 (tmean=2)
        tmean = 10.0 if doy < 182 else 2.0
        # Construct record with tmax/tmin consistent with tmean
        recs.append({"date": d, "tmax": tmean + 2, "tmin": tmean - 2, "tmean": tmean})
    result = growing_season(recs)
    assert len(result) == 1
    assert result[0]["year"] == year
    # first warm run ends at day 6 (start = day 1); first cold run after doy>=182 ends at day 187 (start = day 182)
    # GSL = 182 - 1 = 181 days (delta between start dates as dt.date objects)
    assert result[0]["n"] == 181


def month_recs(year, month, n, tmean):
    out = []
    for d in range(1, n + 1):
        out.append({"date": dt.date(year, month, d), "tmax": tmean + 5, "tmin": tmean - 5, "tmean": tmean})
    return out

def test_monthly_means_and_completeness():
    full = month_recs(2000, 6, 30, 18.0)     # June has 30 days → complete
    partial = month_recs(2026, 6, 26, 20.0)  # 26 < 30-3 → incomplete
    mm = monthly_means(full + partial)
    assert mm[(2000, 6)] == {"mean": 18.0, "meanMax": 23.0, "meanMin": 13.0, "n": 30, "complete": True}
    assert mm[(2026, 6)]["complete"] is False
    assert mm[(2026, 6)]["mean"] == 20.0

def test_month_data_records_normal_thennow():
    from scripts.uccle.derive import month_data
    recs = (month_recs(1990, 6, 30, 15.0) + month_recs(2000, 6, 30, 18.0)
            + month_recs(2020, 6, 30, 20.0) + month_recs(2026, 6, 26, 99.0))  # 2026 partial → excluded from records/normal
    md = month_data(recs, baseline=(1990, 2020), early=(1833, 1990), recent=(2000, 2025))
    june = md["06"]
    assert june["mm"] == "06"
    assert {"year": 2020, "mean": 20.0, "meanMax": 25.0, "meanMin": 15.0, "complete": True} in june["series"]
    assert any(s["year"] == 2026 and s["complete"] is False for s in june["series"])
    assert june["recordWarm"] == {"year": 2020, "v": 20.0}   # 2026 excluded
    assert june["recordCold"] == {"year": 1990, "v": 15.0}
    assert june["normal"] == round((15.0 + 18.0 + 20.0) / 3, 2)  # complete months in 1990-2020
    assert june["thenNow"]["early"]["mean"] == 15.0 and june["thenNow"]["recent"]["mean"] == 19.0


def test_per_date_propagates_provisional():
    recs = [
        {"date": dt.date(2024, 6, 28), "tmax": 28.0, "tmin": 16.0, "tmean": 22.0},
        {"date": dt.date(2026, 6, 28), "tmax": 30.0, "tmin": 18.0, "tmean": 24.0,
         "provisional": True},
    ]
    series = per_date(recs)["0628"]["series"]
    by_year = {e["year"]: e for e in series}
    assert by_year[2026]["provisional"] is True       # provisional record → flagged
    assert "provisional" not in by_year[2024]          # normal record → key omitted

def test_daily_data_groups_by_year_sorted():
    recs = [day(2019, 6, 2, 25, 12), day(2019, 6, 1, 30, 9), day(1990, 6, 1, 20, 5)]
    out = daily_data(recs)
    assert set(out.keys()) == {"1990", "2019"}
    assert [d["mmdd"] for d in out["2019"]] == ["0601", "0602"]   # date-sorted
    assert out["2019"][0] == {"mmdd": "0601", "tmax": 30, "tmin": 9, "recHi": True}

def test_daily_data_flags_record_holder_only():
    recs = [day(1990, 6, 1, 20, 5), day(2019, 6, 1, 30, 9)]
    out = daily_data(recs)
    y1990 = {d["mmdd"]: d for d in out["1990"]}
    y2019 = {d["mmdd"]: d for d in out["2019"]}
    assert y2019["0601"]["recHi"] is True        # 2019 holds the 06-01 high (30)
    assert "recLo" not in y2019["0601"]
    assert y1990["0601"]["recLo"] is True         # 1990 holds the 06-01 low (5)
    assert "recHi" not in y1990["0601"]

def test_daily_data_suppresses_record_flag_on_provisional():
    prov = day(2019, 6, 3, 40, 0); prov["provisional"] = True
    recs = [day(1990, 6, 3, 25, 5), prov]
    out = daily_data(recs)
    y2019 = {d["mmdd"]: d for d in out["2019"]}
    assert y2019["0603"]["provisional"] is True
    assert "recHi" not in y2019["0603"]   # would be the record (40) but provisional → suppressed
    assert "recLo" not in y2019["0603"]   # tmin 0 is lowest but provisional → suppressed
