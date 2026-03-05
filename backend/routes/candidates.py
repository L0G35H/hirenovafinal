"""
TalentLens – Candidate Management Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import firebase_service as fs

router = APIRouter(prefix="/api/candidates", tags=["Candidates"])


@router.get("")
async def list_candidates(
    score_min:    float           = Query(0, ge=0, le=100),
    job_role_id:  Optional[str]   = Query(None),
    skill:        Optional[str]   = Query(None),

):
    candidates = fs.get_all_candidates(
        score_min    = score_min,
        job_role_id  = job_role_id,
        skill_filter = skill,
    )
    # Add rank
    ranked = [{"rank": i + 1, **c} for i, c in enumerate(candidates)]
    return ranked


@router.get("/{candidate_id}")
async def get_candidate(candidate_id: str):
    candidate = fs.get_candidate_by_id(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate
