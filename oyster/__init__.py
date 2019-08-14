from flask import Flask, render_template
from oyster.api import api
from flask_cors import CORS

app = Flask(
    __name__,
    static_url_path="/public",
    static_folder="../client/build",
    template_folder="../client/build"
)
CORS(app)

app.register_blueprint(api)

@app.route("/")
def index():
    return render_template("index.html")