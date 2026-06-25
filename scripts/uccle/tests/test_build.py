import json, datetime as dt
from scripts.uccle.build_data import build
from scripts.uccle.tests.test_derive import day

def test_build_emits_expected_files(tmp_path):
    # two full-ish years so coverage gate passes for at least baseline math paths
    recs = [day(2000,6,25,30,18), day(2019,6,25,33,20)]
    build(records=recs, out_dir=str(tmp_path))
    summary = json.loads((tmp_path/"summary.json").read_text())
    assert summary["station"]["id"] == "BE000006447"
    assert "annual" in summary and "counters" in summary and "rankings" in summary
    assert (tmp_path/"daynorm.json").exists()
    thisday = json.loads((tmp_path/"thisday"/"0625.json").read_text())
    assert thisday["recordHigh"]["v"] == 33.0
