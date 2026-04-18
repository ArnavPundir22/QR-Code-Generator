import io
import os
import base64
import ipaddress
import logging
import socket
import urllib.request
import urllib.parse
import functools
import qrcode
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session,
)
from authlib.integrations.flask_client import OAuth
from PIL import Image, ImageDraw

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_secret_key = os.environ.get("SECRET_KEY")
if not _secret_key:
    logger.warning(
        "SECRET_KEY is not set. A temporary key will be used, which means all "
        "sessions will be invalidated on every restart. Set SECRET_KEY in your "
        ".env file for a persistent key."
    )
    _secret_key = os.urandom(24)
app.secret_key = _secret_key

oauth = OAuth(app)

# ── Google OAuth ─────────────────────────────────────────────────────────────
oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ── GitHub OAuth ─────────────────────────────────────────────────────────────
oauth.register(
    name="github",
    client_id=os.environ.get("GITHUB_CLIENT_ID"),
    client_secret=os.environ.get("GITHUB_CLIENT_SECRET"),
    api_base_url="https://api.github.com/",
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    client_kwargs={"scope": "read:user user:email"},
)


# ── Auth helpers ──────────────────────────────────────────────────────────────
def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ── QR helpers ────────────────────────────────────────────────────────────────
def generate_standard_qr(link, fill_color, back_color, box_size, border):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(link)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    return img.convert("RGB")


def make_circle_logo(logo: Image.Image, size: int) -> Image.Image:
    """Resize logo to a square and apply a circular mask, returning an RGBA image."""
    logo = logo.convert("RGBA")
    logo = logo.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    circle = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    circle.paste(logo, mask=mask)
    return circle


def generate_logo_qr(link, logo_file, fill_color, back_color, box_size, border):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(link)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color=fill_color, back_color=back_color).convert("RGBA")

    logo_size = int(img_qr.size[0] * 0.25)
    logo = make_circle_logo(Image.open(logo_file), logo_size)

    pos = (
        (img_qr.size[0] - logo.size[0]) // 2,
        (img_qr.size[1] - logo.size[1]) // 2,
    )
    img_qr.paste(logo, pos, logo)
    return img_qr.convert("RGB")


def img_to_base64(img):
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


# ── Auth routes ───────────────────────────────────────────────────────────────
@app.route("/login")
def login():
    if "user" in session:
        return redirect(url_for("index"))
    google_enabled = bool(os.environ.get("GOOGLE_CLIENT_ID"))
    github_enabled = bool(os.environ.get("GITHUB_CLIENT_ID"))
    return render_template("login.html",
                           google_enabled=google_enabled,
                           github_enabled=github_enabled)


@app.route("/login/google")
def login_google():
    redirect_uri = url_for("auth_google", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@app.route("/auth/google")
def auth_google():
    token = oauth.google.authorize_access_token()
    user_info = token.get("userinfo") or oauth.google.userinfo()
    session["user"] = {
        "name": user_info.get("name", user_info.get("email", "User")),
        "email": user_info.get("email", ""),
        "avatar": user_info.get("picture", ""),
        "provider": "google",
    }
    return redirect(url_for("index"))


@app.route("/login/github")
def login_github():
    redirect_uri = url_for("auth_github", _external=True)
    return oauth.github.authorize_redirect(redirect_uri)


@app.route("/auth/github")
def auth_github():
    oauth.github.authorize_access_token()
    resp = oauth.github.get("user")
    resp.raise_for_status()
    profile = resp.json()
    session["user"] = {
        "name": profile.get("name") or profile.get("login", "GitHub User"),
        "email": profile.get("email", ""),
        "avatar": profile.get("avatar_url", ""),
        "provider": "github",
    }
    return redirect(url_for("index"))


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


# ── App routes ────────────────────────────────────────────────────────────────
@app.route("/")
@login_required
def index():
    return render_template("index.html", user=session["user"])


@app.route("/generate", methods=["POST"])
@login_required
def generate():
    try:
        link = request.form.get("link", "").strip()
        if not link:
            return jsonify({"error": "Please enter a URL or text to encode."}), 400

        mode = request.form.get("mode", "standard")
        fill_color = request.form.get("fill_color", "#000000")
        back_color = request.form.get("back_color", "#ffffff")
        box_size = int(request.form.get("box_size", 10))
        border = int(request.form.get("border", 4))

        box_size = max(1, min(box_size, 20))
        border = max(0, min(border, 10))

        if mode == "logo":
            logo_file = request.files.get("logo")
            if not logo_file:
                return jsonify({"error": "Please upload a logo image for Logo QR mode."}), 400
            img = generate_logo_qr(link, logo_file, fill_color, back_color, box_size, border)
        else:
            img = generate_standard_qr(link, fill_color, back_color, box_size, border)

        encoded = img_to_base64(img)
        return jsonify({"image": encoded})

    except Exception:
        return jsonify({"error": "An error occurred while generating the QR code. Please check your inputs and try again."}), 500


def _is_safe_url_host(url: str) -> bool:
    """Check whether a URL's hostname resolves to a public, routable IP address.

    Returns False (unsafe) if the hostname resolves to any private, loopback,
    link-local, multicast, or otherwise reserved IP address, blocking SSRF
    attacks that attempt to reach internal services. Returns True only when
    every resolved address is globally routable.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        addr = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        for item in addr:
            ip = ipaddress.ip_address(item[4][0])
            if (ip.is_private or ip.is_loopback or ip.is_link_local
                    or ip.is_reserved or ip.is_multicast):
                return False
        return True
    except Exception:
        return False


@app.route("/shorten", methods=["POST"])
@login_required
def shorten():
    try:
        url = request.json.get("url", "").strip()
        if not url:
            return jsonify({"error": "No URL provided."}), 400
        if not (url.startswith("http://") or url.startswith("https://")):
            return jsonify({"error": "Only http:// and https:// URLs can be shortened."}), 400
        if not _is_safe_url_host(url):
            return jsonify({"error": "The provided URL is not allowed."}), 400
        api_url = "https://tinyurl.com/api-create.php?url=" + urllib.parse.quote(url, safe="")
        try:
            with urllib.request.urlopen(api_url, timeout=5) as resp:
                short = resp.read().decode().strip()
        except urllib.error.HTTPError as exc:
            return jsonify({"error": f"TinyURL returned an error ({exc.code}). Please try again."}), 502
        except urllib.error.URLError:
            return jsonify({"error": "Could not reach the URL shortening service. Check your network."}), 502
        if not short.startswith("http"):
            return jsonify({"error": "Could not shorten the URL."}), 502
        return jsonify({"short_url": short})
    except Exception:
        logger.exception("Unexpected error in /shorten")
        return jsonify({"error": "URL shortening failed. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=False)

