"""
TalentLens – Analytics Routes
"""
from fastapi import APIRouter
import firebase_service as fs
from skill_extractor import SKILL_CATEGORIES

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("")
async def get_analytics():
    """Return dashboard analytics."""
    return fs.get_analytics()


@router.get("/skills")
async def get_skill_categories():
    """Return available skill categories (public, used for job form)."""
    return SKILL_CATEGORIES
