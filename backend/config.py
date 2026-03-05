"""
TalentLens – Configuration (Firebase Admin Removed)
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Environment Variables ──────────────────────────────────────────────────────
JWT_SECRET_KEY             = os.getenv("JWT_SECRET_KEY", "talentlens-dev-secret")
JWT_ALGORITHM              = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS           = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
ADMIN_USERNAME             = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD             = os.getenv("ADMIN_PASSWORD", "talentlens123")
TESSERACT_CMD              = os.getenv("TESSERACT_CMD", r"C:/Program Files/Tesseract-OCR/tesseract.exe")


# Firebase initialization removed from backend as per requirements.
# The backend now runs in "DEMO MODE" (in-memory) for data storage.
def init_firebase():
    pass

def get_db():
    return None

def get_bucket():
    return None
