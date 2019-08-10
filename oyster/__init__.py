from flask import Flask, render_template
from oyster.api import api


app = Flask(
    __name__,
    static_url_path="/public",
    static_folder="../client/build",
    template_folder="../client/build"
)


app.register_blueprint(api)

@app.route("/")
def index():
    return render_template("index.html")