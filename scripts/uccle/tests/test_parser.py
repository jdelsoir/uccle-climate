import datetime as dt
from scripts.uccle.parser import parse_dly, daily_records

def make_line(station, year, month, element, values):
    # values: list of (val_or_None, qflag) up to 31
    line = f"{station:<11}{year:04d}{month:02d}{element:<4}"
    for i in range(31):
        if i < len(values) and values[i][0] is not None:
            v, q = values[i]
        else:
            v, q = -9999, " "
        line += f"{v:5d} {q}{' '}"  # VALUE(5) MFLAG(1) QFLAG(1) SFLAG(1)
    return line

def test_parses_valid_drops_flagged_and_missing():
    txt = "\n".join([
        make_line("BE000006447", 1833, 1, "TMAX", [(83, " "), (-71, "I"), (None, " ")]),
        make_line("BE000006447", 1833, 1, "TMIN", [(12, " "), (5, " "), (None, " ")]),
    ])
    parsed = parse_dly(txt)
    assert parsed[(1833, 1, 1)] == {"TMAX": 8.3, "TMIN": 1.2}
    assert "TMAX" not in parsed.get((1833, 1, 2), {})   # flagged dropped
    assert (1833, 1, 3) not in parsed                    # missing dropped

def test_daily_records_pairs_and_means():
    txt = "\n".join([
        make_line("BE000006447", 1833, 1, "TMAX", [(100, " ")]),
        make_line("BE000006447", 1833, 1, "TMIN", [(0, " ")]),
    ])
    recs = daily_records(parse_dly(txt))
    assert recs == [{"date": dt.date(1833,1,1), "tmax": 10.0, "tmin": 0.0, "tmean": 5.0}]
