"""
TalentLens – Resume Upload & Processing Route
"""
import io
import uuid
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Optional
from models import UploadResponse
from resume_processor import extract_resume_text
from skill_extractor import extract_skills
from skill_matcher import match_skills
from achievement_extractor import extract_achievements_data
import firebase_service as fs
from fastapi import APIRouter, File, UploadFile, Form, HTTPException

router = APIRouter(prefix="/api", tags=["Upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_resume(
    resume: UploadFile = File(...),
    name: str          = Form(...),
    email: str         = Form(...),
    phone: str         = Form(""),
    education: str     = Form(""),
    experience: str    = Form(""),
    job_role_id: str   = Form(...),

):
    # ── Validate file type ──────────────────────────────────────────────────
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await resume.read()

    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Max size is 10MB.")

    # ── Duplicate detection ─────────────────────────────────────────────────
    file_hash = fs.compute_file_hash(file_bytes)
    if fs.check_duplicate(email, file_hash):
        raise HTTPException(
            status_code=409,
            detail="Duplicate resume detected. This email or file has already been submitted.",
        )

    # ── Get job role ────────────────────────────────────────────────────────
    job = fs.get_job_role_by_id(job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found.")

    required_skills   = job.get("required_skills", [])
    min_threshold     = job.get("min_score_threshold", 60.0)
    job_role_name     = job.get("role_name", "Unknown")

    # ── Extract text ────────────────────────────────────────────────────────
    extraction = extract_resume_text(file_bytes)
    text       = extraction["text"]

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from resume.")

    # ── Detect skills ───────────────────────────────────────────────────────
    skill_data     = extract_skills(text)
    detected       = skill_data["detected_skills"]
    by_category    = skill_data["by_category"]

    # ── Extract achievements (NEW: projects / certifications / achievements) ─
    achievement_data = extract_achievements_data(text)

    # ── Match & base score ──────────────────────────────────────────────────
    match_result = match_skills(detected, required_skills, min_threshold)

    # ── Enhanced scoring: 70% skill + 20% projects + 10% certifications ────
    # Falls back to 100% skill score when no achievements detected (safe)
    proj_bonus = min(len(achievement_data["projects"]) * 10, 20)
    cert_bonus = min(len(achievement_data["certifications"]) * 10, 10)
    base_skill_score = match_result["score"]
    if achievement_data["projects"] or achievement_data["certifications"]:
        enhanced_score = round(base_skill_score * 0.7 + proj_bonus + cert_bonus, 1)
    else:
        # No change when nothing detected — pure skill score preserved
        enhanced_score = base_skill_score

    # ── Upload PDF to Firebase Storage ─────────────────────────────────────
    unique_name  = f"{uuid.uuid4().hex}_{resume.filename}"
    resume_url   = fs.upload_resume_to_storage(file_bytes, unique_name)

    # ── Save to database ────────────────────────────────────────────────────
    candidate_data = {
        "name":            name,
        "email":           email,
        "phone":           phone,
        "education":       education,
        "experience":      experience,
        "job_role_id":     job_role_id,
        "job_role":        job_role_name,
        "resume_url":      resume_url,
        "detected_skills": detected,
        "matched_skills":  match_result["matched_skills"],
        "missing_skills":  match_result["missing_skills"],
        "score":           enhanced_score,
        "file_hash":       file_hash,
        "skill_categories": by_category,
        "extraction_method": extraction["method"],
        # Achievement Intelligence fields
        "projects":        achievement_data["projects"],
        "certifications":  achievement_data["certifications"],
        "achievements":    achievement_data["achievements"],
    }
    candidate_id = fs.save_candidate(candidate_data)

    from models import SkillAnalysis
    analysis = SkillAnalysis(
        detected_skills  = detected,
        matched_skills   = match_result["matched_skills"],
        missing_skills   = match_result["missing_skills"],
        score            = enhanced_score,
        skill_categories = by_category,
        projects         = achievement_data["projects"],
        certifications   = achievement_data["certifications"],
        achievements     = achievement_data["achievements"],
    )

    return UploadResponse(
        success        = True,
        message        = f"Resume analyzed successfully. Score: {enhanced_score}%",
        candidate_id   = candidate_id,
        analysis       = analysis,
        candidate_name = name,
        score          = enhanced_score,
    )
