from io import StringIO
import math
from typing import List
from datetime import datetime
import numpy as np
import pandas as pd
from oyster.preprocessing.features import *
from oyster.utils.errors import ETLError, PreprocessingError


WEEKDAYS = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday"
}


def compile_to_dataframe(files: list) -> pd.DataFrame:
    filelist_length = len(files)
    if filelist_length == 1:
        return pd.read_csv(StringIO(files[0].stream.read().decode()))
    elif filelist_length > 1:
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
    home_station: str,
    work_station: str
) -> pd.DataFrame:
    commute_journeys = journeys[
        (journeys.start.str.contains(home_station, case=False)) & (
            journeys.end.str.contains(work_station, case=False))
        | (journeys.start.str.contains(work_station, case=False))
    ].copy()
    if commute_journeys.empty:
        raise PreprocessingError("Home or work station not in journeys!")
    commute_journeys["direction"] = ""
    commute_journeys.loc[
        commute_journeys.end.str.contains(
            work_station, case=False), "direction"
    ] = "To work"
    commute_journeys.loc[
        commute_journeys.start.str.contains(
            work_station, case=False), "direction"
    ] = "From work"
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


def get_earliest_work_day(workday_lengths: pd.DataFrame) -> str:
    return workday_lengths.groupby(
        "weekday"
    ).mean().sort_values(by="start_hour").iloc[0].name


def get_latest_work_day(workday_lengths: pd.DataFrame) -> str:
    return workday_lengths.groupby(
        "weekday"
    ).mean().sort_values(
        by="start_hour", ascending=False
    ).iloc[0].name


def get_earliest_start_time(workday_lengths: pd.DataFrame) -> str:
    earliest_hour = workday_lengths.sort_values(
        by="start_hour"
    ).iloc[0].start_hour
    minute, hour = math.modf(earliest_hour)
    minute = int(minute * 60)
    return "{:.0f}:{}".format(hour, minute)


def get_latest_end_time(workday_lengths: pd.DataFrame) -> str:
    latest_hour = workday_lengths.sort_values(
        by="end_hour", ascending=False
    ).iloc[0].end_hour
    minute, hour = math.modf(latest_hour)
    minute = int(minute * 60)
    return "{:.0f}:{}".format(hour, minute)


def work_commute_summary(
    journeys: pd.DataFrame,
    home_station: str,
    work_station: str
) -> dict:
    commute_journeys = assemble_work_commute_journeys(
        journeys=journeys,
        home_station=home_station,
        work_station=work_station
    )
    workday_lengths = get_workday_lengths(commute_journeys)
    earliest_work_day = get_earliest_work_day(workday_lengths)
    latest_work_day = get_latest_work_day(workday_lengths)
    earliest_start_time = get_earliest_start_time(workday_lengths)
    latest_end_time = get_latest_end_time(workday_lengths)

    work_commute_lengths = get_work_commute_lengths(commute_journeys)
    return {
        "workdays": workday_lengths.to_dict(orient="records"),
        "work_commutes": work_commute_lengths.to_dict(orient="records"),
        "earliest_work_day": earliest_work_day,
        "latest_work_day": latest_work_day,
        "earliest_start_time": earliest_start_time,
        "latest_end_time": latest_end_time
    }


def commute_journeys_pipeline(
    df: pd.DataFrame,
    home_station: str = "Stepney Green",
    work_station: str = "Gallions Reach DLR"
) -> dict:
    return (
        df.pipe(process_journeys)
          .pipe(
              work_commute_summary,
              home_station=home_station,
              work_station=work_station
        )
    )
