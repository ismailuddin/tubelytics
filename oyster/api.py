import io
import json
from flask import Blueprint, request, Response, jsonify
import pandas as pd
from oyster.utils.errors import ETLError, PreprocessingError
from oyster.preprocessing.etl import (
    compile_to_dataframe,
    commute_journeys_pipeline
)

api = Blueprint("api", __name__)


@api.route('/api/upload', methods=["POST"])
def upload_files():
    if request.method == "POST":
        if "files[]" in request.files:
            files = request.files.getlist("files[]")
            home_station = request.form["home_station"].replace(
                "Station", "").strip()
            work_station = request.form["work_station"].replace(
                "Station", "").strip()
            try:
                all_journeys = compile_to_dataframe(files)
                journey_summary = commute_journeys_pipeline(
                    df=all_journeys,
                    home_station=home_station,
                    work_station=work_station
                )
            except PreprocessingError as error:
                return Response(error.message, status=500)
            return jsonify(journey_summary)
        return Response(500, "No files uploaded.")
