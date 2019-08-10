from io import StringIO
from typing import List
from datetime import datetime
import pandas as pd
from oyster.preprocessing.features import *


WEEKDAYS = {
    0: "Mon",
    1: "Tue",
    2: "Wed",
    3: "Thu",
    4: "Fri",
    5: "Sat",
    6: "Sun"
}


def compile_to_dataframe(files: list) -> pd.DataFrame:
    return pd.concat([
        pd.read_csv(StringIO(file.stream.read().decode()))
        for file in files
    ])


def process_journeys(df: pd.DataFrame) -> pd.DataFrame:
    df.Date = pd.to_datetime(df.Date)
    df = df.sort_values(by="Date", ascending=True).reset_index(drop=True)
    df = df[df["Journey/Action"].str.contains(" to ")].copy()
    df = df.drop(columns=["Credit", "Note", "Charge", "Balance"])
    df = df[~df.isnull().any(axis=1)]

    df["start"] = df["Journey/Action"].apply(lambda row: parse_journey(row, 0))
    df["end"] = df["Journey/Action"].apply(lambda row: parse_journey(row, 1))
    df = df.drop(columns=["Journey/Action"])

    df["start_mode"] = df["start"].apply(lambda row: get_transport_mode(row))
    df["end_mode"] = df["end"].apply(lambda row: get_transport_mode(row))

    df["start"] = df["start"].apply(lambda row: remove_transport_mode(row))
    df["end"] = df["end"].apply(lambda row: remove_transport_mode(row))

    df["start_time"] = df[["Date", "Start Time"]].apply(
        lambda row: parse_time(row, "start"), axis=1
    )
    df["end_time"] = df[["Date", "End Time"]].apply(
        lambda row: parse_time(row, "end"), axis=1
    )
    df = df.drop(columns=["Start Time", "End Time"])

    df["journey_time"] = df.end_time - df.start_time
    df.journey_time = df.journey_time.fillna(0)
    df["weekday"] = df.Date.apply(lambda row: WEEKDAYS[row.weekday()])
    df["jt_minutes"] = df.journey_time.apply(
        lambda row: row.total_seconds() / 60
    )
    return df


def assemble_work_commute_journeys(
    journeys: pd.DataFrame,
    home_station: str = "Stepney Green",
    work_station: str = "Gallions Reach DLR"
) -> pd.DataFrame:
    commute_journeys = journeys[
        (journeys.start == home_station) & (journeys.end == work_station)
        | (journeys.start == work_station)
    ].copy()
    commute_journeys["direction"] = ""
    commute_journeys.loc[
        commute_journeys.end == work_station, "direction"
    ] = "to_work"
    commute_journeys.loc[
        commute_journeys.start == work_station, "direction"
    ] = "from_work"
    return commute_journeys


def get_workday_lengths(commute_journeys: pd.DataFrame) -> pd.DataFrame:
    workdays = commute_journeys.groupby("Date").aggregate(
        {
            "start_time": lambda x: sorted(list(x)),
            "end_time": lambda x: sorted(list(x))
        }
    )
    workdays["workday_length"] = workdays.apply(
        lambda row: calc_work_day_length(row), axis=1
    )
    # Filter out workdays' of less than 1 minute
    workdays = workdays[
        workdays.workday_length > pd.Timedelta(1, "m")
    ]
    workdays["iso_weekday"] = workdays.index.weekday
    workdays["week_of_year"] = workdays.index.week
    workdays["start_hour"] = workdays.end_time.apply(
        lambda x: x[0].hour + (x[0].minute / 60)
    )
    workdays["end_hour"] = workdays.start_time.apply(
        lambda x: x[1].hour + (x[1].minute / 60)
    )
    workdays["weekday"] = workdays.iso_weekday.apply(
        lambda x: WEEKDAYS[x]
    )
    return workdays.drop(columns=["start_time", "end_time", "workday_length"])


def get_work_commute_lengths(commute_journeys: pd.DataFrame) -> pd.DataFrame:
    commute_journeys["iso_weekday"] = commute_journeys.Date.dt.weekday
    commute_lengths = commute_journeys.groupby(
        ["iso_weekday", "direction"]
    ).mean().reset_index()
    commute_lengths["weekday"] = commute_lengths.iso_weekday.apply(
        lambda x: WEEKDAYS[x]
    )
    commute_lengths["jt_minutes"] = commute_lengths.jt_minutes.round(0)
    return commute_lengths[["weekday", "direction", "jt_minutes"]]


def work_commute_summary(
    journeys: pd.DataFrame,
    home_station: str = "Stepney Green",
    work_station: str = "Gallions Reach DLR"
) -> dict:
    commute_journeys = assemble_work_commute_journeys(journeys)
    workday_lengths = get_workday_lengths(commute_journeys)
    work_commute_lengths = get_work_commute_lengths(commute_journeys)
    return {
        "workdays": workday_lengths.to_dict(orient="records"),
        "work_commutes": work_commute_lengths.to_dict(orient="records")
    }


def commute_journeys_pipeline(df: pd.DataFrame) -> dict:
    return (
        df.pipe(process_journeys)
          .pipe(work_commute_summary)
    )
