# QR Code Generator

A web-based QR code generator built with **Python** and **Flask**. Generate standard QR codes or QR codes with an embedded logo, with full customisation over colours, size, and border.

---

## Features

- **Standard QR Mode** – Generate clean QR codes from any URL or text.
- **Logo QR Mode** – Embed a custom logo (PNG, JPG, SVG) into the centre of the QR code.
- **Colour Customisation** – Choose any foreground and background colour with a colour picker.
- **Colour Presets** – One-click presets: Classic, Violet, Sky, Emerald, Rose, and Amber.
- **Size Controls** – Adjust box size (1–20) and border width (0–10) with sliders.
- **Dark / Light Theme** – Toggle between dark and light mode.
- **Download** – Save the generated QR code as a PNG file.
- **High Error Correction** – All QR codes use Error Correction Level H (30%), ensuring readability even with a logo overlay.

---

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Backend  | Python 3, Flask     |
| QR Gen   | qrcode              |
| Imaging  | Pillow (PIL)        |
| Frontend | HTML, CSS, Vanilla JS |

---

## Project Structure

```
QR-Code-Generator/
├── app.py                  # Flask application & API routes
├── StandardQR_Generator.py # Standalone script: standard QR code
├── LogoQR_Generator.py     # Standalone script: QR code with logo
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html          # Main web UI
└── static/
    ├── css/                # Stylesheets
    └── js/                 # Frontend JavaScript
```

---

## Getting Started

### Prerequisites

- Python 3.8 or higher
- pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ArnavPundir22/QR-Code-Generator.git
   cd QR-Code-Generator
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the app**
   ```bash
   python app.py
   ```

4. **Open in your browser**
   ```
   http://127.0.0.1:5000
   ```

---

## Usage

### Web App

1. Enter a URL or any text in the input field.
2. Choose **Standard** or **With Logo** mode using the tabs.
   - In **Logo** mode, upload a PNG/JPG/SVG image to embed in the QR code.
3. Pick foreground and background colours (or select a colour preset).
4. Adjust the **Box Size** and **Border** sliders as desired.
5. Click **Generate QR Code**.
6. Click **Download PNG** to save the result.

### Standalone Scripts

**Standard QR code** (edit the `link` variable in the script):
```bash
python StandardQR_Generator.py
# Output: qrcode_standard.png
```

**QR code with logo** (edit `link` and `logo_filename` in the script):
```bash
python LogoQR_Generator.py
# Output: logo.png
```

---

## API

### `POST /generate`

Generates a QR code and returns it as a base64-encoded PNG.

**Form fields:**

| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| `link`       | string | Yes      | URL or text to encode                    |
| `mode`       | string | No       | `standard` (default) or `logo`           |
| `logo`       | file   | Logo mode| Logo image file                          |
| `fill_color` | string | No       | Foreground hex colour (default `#000000`)|
| `back_color` | string | No       | Background hex colour (default `#ffffff`)|
| `box_size`   | int    | No       | Module size in pixels, 1–20 (default 10) |
| `border`     | int    | No       | Quiet zone in modules, 0–10 (default 4)  |

**Success response:**
```json
{ "image": "<base64 PNG string>" }
```

**Error response:**
```json
{ "error": "<error message>" }
```

---

## Dependencies

```
qrcode==8.2
Pillow>=10.0.0
Flask>=3.0.0
```

---

## License

This project is open source. Feel free to use, modify, and distribute it.
