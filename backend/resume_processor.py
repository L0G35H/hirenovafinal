"""
TalentLens – Resume Text Extraction (pdfplumber + Tesseract OCR fallback)
"""
import io
import os
import pytesseract
import pdfplumber
from PIL import Image
from config import TESSERACT_CMD

# Set Tesseract path for Windows
if os.path.exists(TESSERACT_CMD.replace("/", "\\")):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD.replace("/", "\\")

MIN_TEXT_LENGTH = 100  # Characters threshold to decide if OCR is needed


def extract_text_pdfplumber(pdf_bytes: bytes) -> str:
    """Extract text from PDF using pdfplumber."""
    text_parts = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        print(f"pdfplumber error: {e}")
    return "\n".join(text_parts)


def extract_text_ocr(pdf_bytes: bytes) -> str:
    """Extract text from image-based PDF using Tesseract OCR via pdf2image."""
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(pdf_bytes, dpi=200)
        text_parts = []
        for img in images:
            text = pytesseract.image_to_string(img, lang="eng")
            if text.strip():
                text_parts.append(text)
        return "\n".join(text_parts)
    except ImportError:
        print("⚠️  pdf2image not installed. OCR unavailable.")
        return ""
    except Exception as e:
        print(f"OCR error: {e}")
        return ""


def extract_resume_text(pdf_bytes: bytes) -> dict:
    """
    Master extraction function.
    1. Try pdfplumber. If extracted text is too short → fallback to OCR.
    Returns { 'text': str, 'method': 'pdfplumber'|'ocr'|'failed' }
    """
    # Step 1: Try pdfplumber
    text = extract_text_pdfplumber(pdf_bytes)
    if len(text.strip()) >= MIN_TEXT_LENGTH:
        return {"text": text, "method": "pdfplumber"}

    # Step 2: OCR fallback
    print("📷 Text too short from pdfplumber, switching to OCR...")
    ocr_text = extract_text_ocr(pdf_bytes)
    if len(ocr_text.strip()) >= 20:
        combined = (text + "\n" + ocr_text).strip()
        return {"text": combined, "method": "ocr"}

    return {"text": text or ocr_text, "method": "failed"}
