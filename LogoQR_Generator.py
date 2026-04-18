import qrcode
from PIL import Image

def create_qr_with_logo(link, logo_path, output_filename="logo.png"):
    # 1. Generate QR Code with High Error Correction
    # We use ERROR_CORRECT_H (High) so that the QR code remains readable
    # even when 30% of it is covered by the logo.
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(link)
    qr.make(fit=True)

    # 2. Create the QR image (convert to RGB to allow colored logos if needed)
    img_qr = qr.make_image(fill_color="black", back_color="white").convert('RGB')

    # 3. Open the logo image
    try:
        logo = Image.open(logo_path)
    except FileNotFoundError:
        print(f"Error: Could not find the logo file at '{logo_path}'")
        return

    # 4. Calculate the size for the logo
    # The logo should generally not cover more than 20-25% of the QR code area
    # We calculate the width to be 25% of the QR code's width
    logo_width_ratio = 0.25
    logo_base_width = int(img_qr.size[0] * logo_width_ratio)

    # Calculate height to keep aspect ratio
    w_percent = (logo_base_width / float(logo.size[0]))
    h_size = int((float(logo.size[1]) * float(w_percent)))

    # Resize the logo using high-quality resampling (LANCZOS)
    logo = logo.resize((logo_base_width, h_size), Image.Resampling.LANCZOS)

    # 5. Calculate the position to center the logo
    pos = ((img_qr.size[0] - logo.size[0]) // 2, (img_qr.size[1] - logo.size[1]) // 2)

    # 6. Paste the logo onto the QR code
    # Use the logo itself as a mask if it has transparency (RGBA)
    img_qr.paste(logo, pos, logo if logo.mode == 'RGBA' else None)

    # 7. Save the final result
    img_qr.save(output_filename)
    print(f"Success! QR code with logo saved as '{output_filename}'")

# --- usage ---
link = "https://forms.gle/nkZ3AqU9aKpCe8e9A"
# Make sure to rename your uploaded file to 'logo.png' or update the name below
logo_filename = "unnamed.png"

create_qr_with_logo(link, logo_filename)
