import json
import datetime as dt
from scripts.uccle.build_data import build, merge_archive
from scripts.uccle.tests.test_derive import day, recs_for

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


def test_merge_archive_keeps_ghcn_and_fills_gaps():
    recs = [{"date": dt.date(2010, 1, 1), "tmax": 5.0, "tmin": 1.0, "tmean": 3.0}]
    archive = {
        dt.date(2010, 1, 1): {"tmax": 9.9, "tmin": 9.9},   # overlap → GHCN wins
        dt.date(2010, 1, 2): {"tmax": 6.0, "tmin": 2.0},    # gap → filled
        dt.date(2010, 1, 3): {"tmax": None, "tmin": 3.0},   # incomplete → skipped
    }
    m = merge_archive(recs, archive)
    byd = {r["date"]: r for r in m}
    assert byd[dt.date(2010, 1, 1)]["tmax"] == 5.0                       # GHCN authoritative
    assert byd[dt.date(2010, 1, 2)]["tmax"] == 6.0
    assert byd[dt.date(2010, 1, 2)]["tmean"] == 4.0                      # filled mean computed
    assert dt.date(2010, 1, 3) not in byd                               # None skipped
    assert [r["date"] for r in m] == sorted(byd)                        # sorted by date


def test_build_fills_incomplete_year_from_archive(tmp_path):
    ghcn = recs_for(2010, 10, 12.0)  # only 10 GHCN days in 2010 → incomplete alone
    archive = {dt.date(2010, 1, 1) + dt.timedelta(days=i): {"tmax": 17.0, "tmin": 7.0}
               for i in range(365)}
    build(records=ghcn, archive=archive, out_dir=str(tmp_path))
    summary = json.loads((tmp_path / "summary.json").read_text())
    y2010 = next(a for a in summary["annual"] if a["year"] == 2010)
    assert y2010["incomplete"] is False  # archive fill makes it a complete year
