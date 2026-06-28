import json
import datetime as dt
from scripts.uccle.build_data import build, merge_fills
from scripts.uccle.tests.test_derive import day, recs_for, month_recs

def test_build_emits_expected_files(tmp_path):
    recs = (recs_for(1991, 365, 10.0) + recs_for(2000, 365, 11.0)
            + recs_for(2019, 365, 12.0) + [day(2019, 6, 25, 33, 20)])
    build(records=recs, out_dir=str(tmp_path))
    summary = json.loads((tmp_path / "summary.json").read_text())
    assert summary["station"]["id"] == "BE000006447"
    assert {"annual", "counters", "rankings", "anomaly", "decadal", "warmingRate"} <= summary.keys()
    assert summary["baselines"]["1991-2020"] is not None
    assert summary["warmingRate"]["full"] is not None
    assert len(summary["anomaly"]["1991-2020"]) > 0
    assert (tmp_path / "daynorm.json").exists()
    thisday = json.loads((tmp_path / "thisday" / "0625.json").read_text())
    assert thisday["recordHigh"]["v"] == 33.0
    # records-this-year: latest year is 2019; it holds the 06-25 record high (33.0)
    assert summary["records"]["year"] == 2019
    assert summary["records"]["highs"] >= 1
    # top-10 daily extremes: warmest day is 2019-06-25 at 33.0
    assert summary["extremes"]["warmest"][0] == {"date": "2019-06-25", "v": 33.0}
    assert len(summary["extremes"]["warmest"]) == 10
    assert len(summary["extremes"]["coldest"]) == 10


def test_merge_fills_keeps_ghcn_and_fills_gaps():
    recs = [{"date": dt.date(2010, 1, 1), "tmax": 5.0, "tmin": 1.0, "tmean": 3.0}]
    archive = {
        dt.date(2010, 1, 1): {"tmax": 9.9, "tmin": 9.9},   # overlap → GHCN wins
        dt.date(2010, 1, 2): {"tmax": 6.0, "tmin": 2.0},    # gap → filled
        dt.date(2010, 1, 3): {"tmax": None, "tmin": 3.0},   # incomplete → skipped
    }
    m = merge_fills(recs, archive)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2010, 1, 1)]["tmax"] == 5.0                       # GHCN authoritative
    assert byd[dt.date(2010, 1, 2)]["tmax"] == 6.0
    assert byd[dt.date(2010, 1, 2)]["tmean"] == 4.0                      # filled mean computed
    assert dt.date(2010, 1, 3) not in byd                               # None skipped
    assert [r["date"] for r in m] == sorted(byd)                        # sorted by date
    assert "provisional" not in byd[dt.date(2010, 1, 2)]                # no today → never provisional


def test_merge_fills_precedence_archive_over_recent():
    recs = []
    archive = {dt.date(2010, 1, 2): {"tmax": 6.0, "tmin": 2.0}}
    recent = {dt.date(2010, 1, 2): {"tmax": 99.0, "tmin": 99.0},        # same date → archive wins
              dt.date(2010, 1, 4): {"tmax": 8.0, "tmin": 3.0}}          # archive lacks → forecast fills
    m = merge_fills(recs, archive, recent)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2010, 1, 2)]["tmax"] == 6.0                      # ERA5 beats forecast
    assert byd[dt.date(2010, 1, 4)]["tmax"] == 8.0                      # forecast fills the rest


def test_merge_fills_cutoff_drops_today_and_future():
    today = dt.date(2026, 6, 28)
    recent = {dt.date(2026, 6, 27): {"tmax": 30.0, "tmin": 18.0},       # yesterday → kept
              dt.date(2026, 6, 28): {"tmax": 31.0, "tmin": 19.0},       # today → dropped
              dt.date(2026, 6, 29): {"tmax": 32.0, "tmin": 20.0}}       # future → dropped
    m = merge_fills([], None, recent, today=today)
    dates = {r["date"] for r in m}
    assert dt.date(2026, 6, 27) in dates
    assert dt.date(2026, 6, 28) not in dates                           # today belongs to live app
    assert dt.date(2026, 6, 29) not in dates                           # future date dropped too


def test_merge_fills_tags_recent_days_provisional():
    today = dt.date(2026, 6, 28)
    ghcn = [{"date": dt.date(2026, 6, 25), "tmax": 1.0, "tmin": 1.0, "tmean": 1.0}]  # GHCN, recent
    recent = {
        dt.date(2026, 6, 27): {"tmax": 30.0, "tmin": 18.0},  # within lag → provisional
        dt.date(2026, 6, 23): {"tmax": 28.0, "tmin": 16.0},  # exactly today-5 (lag edge) → provisional
        dt.date(2026, 6, 20): {"tmax": 25.0, "tmin": 15.0},  # 8 days back → final
    }
    m = merge_fills(ghcn, None, recent, today=today, lag=5)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2026, 6, 27)]["provisional"] is True            # filled & within lag
    assert byd[dt.date(2026, 6, 23)]["provisional"] is True            # inclusive lag boundary today-5
    assert "provisional" not in byd[dt.date(2026, 6, 20)]              # filled but older than lag
    assert "provisional" not in byd[dt.date(2026, 6, 25)]             # GHCN never provisional


def test_build_fills_incomplete_year_from_archive(tmp_path):
    ghcn = recs_for(2010, 10, 12.0)  # only 10 GHCN days in 2010 → incomplete alone
    archive = {dt.date(2010, 1, 1) + dt.timedelta(days=i): {"tmax": 17.0, "tmin": 7.0}
               for i in range(365)}
    build(records=ghcn, archive=archive, out_dir=str(tmp_path))
    summary = json.loads((tmp_path / "summary.json").read_text())
    y2010 = next(a for a in summary["annual"] if a["year"] == 2010)
    assert y2010["incomplete"] is False  # archive fill makes it a complete year


def test_build_flags_recent_provisional_in_thisday(tmp_path):
    ghcn = recs_for(2026, 100, 18.0)  # 2026-01-01 .. 2026-04-10 (06-27 absent from GHCN)
    recent = {dt.date(2026, 6, 27): {"tmax": 33.0, "tmin": 22.0}}
    build(records=ghcn, recent=recent, today=dt.date(2026, 6, 28), out_dir=str(tmp_path))
    thisday = json.loads((tmp_path / "thisday" / "0627.json").read_text())
    entry = next(e for e in thisday["series"] if e["year"] == 2026)
    assert entry["tmax"] == 33.0
    assert entry["provisional"] is True


def test_build_emits_month_files(tmp_path):
    recs = month_recs(2000, 6, 30, 18.0) + month_recs(2020, 6, 30, 20.0)
    build(records=recs, out_dir=str(tmp_path))
    june = json.loads((tmp_path / "month" / "06.json").read_text())
    assert june["mm"] == "06"
    assert june["recordWarm"] == {"year": 2020, "v": 20.0}
    assert (tmp_path / "month" / "01.json").exists()  # all 12 emitted
