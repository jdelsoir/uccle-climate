import json
from scripts.uccle.build_data import build
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
