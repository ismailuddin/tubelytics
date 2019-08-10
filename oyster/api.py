import io
import json
from flask import Blueprint, request, Response, jsonify
import pandas as pd
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
            all_journeys = compile_to_dataframe(files)
            journey_summary = commute_journeys_pipeline(all_journeys)
            return jsonify(journey_summary)
        return Response(500, "No files uploaded.")
