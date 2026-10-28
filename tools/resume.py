"""Render assets/resume.pdf to the image the résumé viewer shows.

Run after replacing the PDF:  python tools/resume.py
Writes assets/resume-page.webp (2x, for sharp text on retina screens).
"""
import os
import fitz  # PyMuPDF
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = fitz.open(os.path.join(root, 'assets', 'resume.pdf'))
page = pdf[0]
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
out = os.path.join(root, 'assets', 'resume-page.webp')
img.save(out, 'WEBP', quality=88, method=6)
print(f'{out}: {img.width}x{img.height}, {os.path.getsize(out) // 1024} KB, {pdf.page_count} page(s)')
