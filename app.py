import io
import base64
import urllib.request
import urllib.parse
import qrcode
from flask import Flask, render_template, request, jsonify
from PIL import Image, ImageDraw

app = Flask(__name__)


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

