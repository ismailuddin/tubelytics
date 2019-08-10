from flask import Flask
from oyster.api import api
from flask_cors import CORS

app = Flask(
    __name__,
    static_url_path="/public",
    static_folder="../client/build"
)
CORS(app)

app.register_blueprint(api)
