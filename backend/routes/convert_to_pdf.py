import sys
import os
import shutil
from pathlib import Path
import tempfile

# Libraries
try:
    from docx2pdf import convert as docx_convert
except ImportError:
    docx_convert = None

from PIL import Image
from reportlab.pdfgen import canvas
import pypandoc

# Ensure file argument exists
if len(sys.argv) < 2:
    print("ERROR: No file path provided", file=sys.stderr)
    sys.exit(1)

# Use absolute paths
file_path = os.path.abspath(sys.argv[1])
filename, ext = os.path.splitext(os.path.basename(file_path))
output_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads", "uploadFiles", "pdf"))
os.makedirs(output_folder, exist_ok=True)
output_pdf = os.path.join(output_folder, filename + ".pdf")

ext = ext.lower()

try:
    if ext == ".pdf":
        print(file_path)
        sys.exit(0)

    elif ext == ".docx":
        try:
            # Create a temp folder without spaces
            with tempfile.TemporaryDirectory() as tmpdir:
                temp_docx = os.path.join(tmpdir, filename + ".docx")
                temp_pdf = os.path.join(tmpdir, filename + ".pdf")

                # Copy DOCX to temp folder (no spaces in path)
                shutil.copy(file_path, temp_docx)

                # Try converting using docx2pdf
                if docx_convert:
                    docx_convert(temp_docx, tmpdir)
                    shutil.move(temp_pdf, output_pdf)
                else:
                    raise Exception("docx2pdf unavailable")

        except Exception as e:
            print(f"docx2pdf failed: {e}. Trying pypandoc...", file=sys.stderr)
            # Try pypandoc safely
            try:
                pypandoc.convert_file(file_path, "pdf", outputfile=output_pdf)
            except Exception as e2:
                print(f"ERROR: pypandoc failed: {e2}", file=sys.stderr)
                sys.exit(1)

    elif ext in [".jpg", ".jpeg", ".png"]:
        image = Image.open(file_path)
        rgb_image = image.convert("RGB")
        rgb_image.save(output_pdf)

    elif ext == ".txt":
        c = canvas.Canvas(output_pdf)
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        c.setFont("Helvetica", 12)
        y = 750
        for line in text.split("\n"):
            c.drawString(72, y, line)
            y -= 15
        c.save()

    else:
        print(f"ERROR: Unsupported file type: {ext}", file=sys.stderr)
        sys.exit(1)

    print(output_pdf)

except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)