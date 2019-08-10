from datetime import datetime, timedelta
import re

TRANSPORT_MODE = re.compile(r"\[(\w*.)+\]")


def parse_journey(row: str, index: int) -> str:
    if " to " in row:
        return row.split(" to ")[index]
    else:
        return None


def get_transport_mode(row: str) -> str:
    if not row:
        return None
    match = TRANSPORT_MODE.search(row)
    if match:
        s, e = match.span()
        return row[s + 1 : e - 1]
    else:
        return "London Underground"


def remove_transport_mode(row: str) -> str:
    if not row:
        return None
    return TRANSPORT_MODE.sub("", row).strip()


def parse_time(row: dict, direction: str) -> datetime:
    date = row["Date"]
    if direction == "start":
        h, m = row["Start Time"].split(":")
    elif direction == "end":
        h, m = row["End Time"].split(":")
    return datetime(
        year=date.year,
        month=date.month,
        day=date.day,
        hour=int(h),
        minute=int(m)
    )


def calc_work_day_length(row: dict) -> list:
    if len(row["end_time"]) > 1 and len(row["start_time"]) > 1:
        return sorted(row["start_time"])[1] - sorted(row["end_time"])[0]
    else:
        return timedelta(0)
