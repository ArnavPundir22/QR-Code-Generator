import io
import base64
import os
import time
import threading
import urllib.request
import urllib.parse
import qrcode
from flask import Flask, render_template, request, jsonify, send_from_directory
from PIL import Image, ImageDraw

app = Flask(__name__)
start_time = time.time()


class KeepAliveWorker:
    def __init__(self):
        self.live_url = os.getenv("RENDER_EXTERNAL_URL") or os.getenv("LIVE_LINK") or os.getenv("KEEP_ALIVE_URL") or ""
        self.interval = 600  # 10 minutes in seconds (Render spins down after 15 mins of inactivity)
        self.enabled = True
        self.last_ping_time = None
        self.last_status = "idle"
        self.ping_count = 0
        self.ping_logs = []
        self._thread = None
        self._running = False

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()

    def _loop(self):
        while self._running:
            time.sleep(10)
            if self.enabled and self.live_url:
                now = time.time()
                if self.last_ping_time is None or (now - self.last_ping_time) >= self.interval:
                    self.ping_now()

    def ping_now(self):
        if not self.live_url:
            return {"status": "error", "message": "No live URL configured"}

        target = self.live_url.rstrip("/") + "/ping"
        start_ts = time.time()
        try:
            req = urllib.request.Request(
                target,
                headers={"User-Agent": "Render-KeepAlive-Bot/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                code = resp.getcode()
                latency_ms = round((time.time() - start_ts) * 1000, 2)
                self.last_ping_time = time.time()
                self.ping_count += 1
                self.last_status = f"success ({code})"
                log_entry = {
                    "time": time.strftime("%H:%M:%S", time.localtime()),
                    "url": target,
                    "status": code,
                    "latency_ms": latency_ms,
                    "success": True
                }
                self.ping_logs.insert(0, log_entry)
                self.ping_logs = self.ping_logs[:20]
                return {"status": "ok", "log": log_entry}
        except Exception as e:
            latency_ms = round((time.time() - start_ts) * 1000, 2)
            self.last_ping_time = time.time()
            self.last_status = f"failed ({str(e)})"
            log_entry = {
                "time": time.strftime("%H:%M:%S", time.localtime()),
                "url": target,
                "status": str(e),
                "latency_ms": latency_ms,
                "success": False
            }
            self.ping_logs.insert(0, log_entry)
            self.ping_logs = self.ping_logs[:20]
            return {"status": "error", "log": log_entry}


keep_alive_worker = KeepAliveWorker()
keep_alive_worker.start()


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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json", mimetype="application/manifest+json")


@app.route("/sw.js")
def service_worker():
    response = send_from_directory("static", "sw.js", mimetype="text/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static/icons", "favicon.png", mimetype="image/png")


@app.route("/ping")
def ping():
    return jsonify({
        "status": "awake",
        "message": "Render instance is active and awake",
        "timestamp": time.time(),
        "uptime_seconds": round(time.time() - start_time, 2)
    })


@app.route("/api/keep-alive", methods=["GET", "POST"])
def keep_alive_api():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        action = data.get("action")
        if action == "set_url" or "live_url" in data:
            new_url = data.get("live_url", "").strip()
            keep_alive_worker.live_url = new_url
        if data.get("enabled") is not None:
            keep_alive_worker.enabled = bool(data.get("enabled"))
        if action == "ping_now":
            res = keep_alive_worker.ping_now()
            return jsonify(res)

    return jsonify({
        "live_url": keep_alive_worker.live_url,
        "enabled": keep_alive_worker.enabled,
        "interval_seconds": keep_alive_worker.interval,
        "ping_count": keep_alive_worker.ping_count,
        "last_ping_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(keep_alive_worker.last_ping_time)) if keep_alive_worker.last_ping_time else None,
        "last_status": keep_alive_worker.last_status,
        "logs": keep_alive_worker.ping_logs
    })


@app.route("/generate", methods=["POST"])
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


@app.route("/shorten", methods=["POST"])
def shorten():
    try:
        url = request.json.get("url", "").strip()
        if not url:
            return jsonify({"error": "No URL provided."}), 400
        if not (url.startswith("http://") or url.startswith("https://")):
            return jsonify({"error": "Only http:// and https:// URLs can be shortened."}), 400
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
        return jsonify({"error": "URL shortening failed. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=False)

