import qrcode

# 1. Define the link
link = "https://forms.gle/nkZ3AqU9aKpCe8e9A"

# 2. Generate the QR Code (High Error Correction to allow for future logo placement if edited manually)
qr = qrcode.QRCode(
    version=None,
    error_correction=qrcode.constants.ERROR_CORRECT_H, # High error correction (30%) is crucial for logos
    box_size=10,
    border=4,
)
qr.add_data(link)
qr.make(fit=True)

# 3. Create the image
img = qr.make_image(fill_color="black", back_color="white")
img.save("qrcode_standard.png")
