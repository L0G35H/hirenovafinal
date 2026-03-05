"""
TalentLens – Firebase Firestore & Storage Service Layer
With in-memory fallback for demo/development without Firebase credentials.
"""
import uuid
import hashlib
from datetime import datetime
from typing import List, Optional, Dict, Any
from config import get_db, get_bucket

# ── In-memory demo store (used when Firebase is not configured) ────────────────
_demo_candidates: Dict[str, dict] = {}
_demo_jobs:       Dict[str, dict] = {}
_firebase_mode = True  # will be set to False if Firestore unavailable


def _is_firebase_available() -> bool:
    try:
        db = get_db()
        return db is not None
    except Exception:
        return False


# ── Job Roles ──────────────────────────────────────────────────────────────────

def save_job_role(data: dict) -> str:
    job_id = str(uuid.uuid4())
    data["id"]         = job_id
    data["created_at"] = datetime.utcnow().isoformat()
    if _is_firebase_available():
        get_db().collection("job_roles").document(job_id).set(data)
    else:
        _demo_jobs[job_id] = data
    return job_id


def get_job_roles() -> List[dict]:
    if _is_firebase_available():
        docs = get_db().collection("job_roles").stream()
        return [d.to_dict() for d in docs]
    return list(_demo_jobs.values())


def get_job_role_by_id(job_id: str) -> Optional[dict]:
    if _is_firebase_available():
        doc = get_db().collection("job_roles").document(job_id).get()
        return doc.to_dict() if doc.exists else None
    return _demo_jobs.get(job_id)


def update_job_role(job_id: str, data: dict) -> bool:
    if _is_firebase_available():
        ref = get_db().collection("job_roles").document(job_id)
        if ref.get().exists:
            ref.update(data)
            return True
        return False
    if job_id in _demo_jobs:
        _demo_jobs[job_id].update(data)
        return True
    return False


def delete_job_role(job_id: str) -> bool:
    if _is_firebase_available():
        ref = get_db().collection("job_roles").document(job_id)
        if ref.get().exists:
            ref.delete()
            return True
        return False
    if job_id in _demo_jobs:
        del _demo_jobs[job_id]
        return True
    return False


# ── Candidates ─────────────────────────────────────────────────────────────────

def check_duplicate(email: str, file_hash: str) -> bool:
    """Return True if duplicate exists."""
    if _is_firebase_available():
        db = get_db()
        by_email = db.collection("candidates").where("email", "==", email).limit(1).get()
        if by_email:
            return True
        by_hash  = db.collection("candidates").where("file_hash", "==", file_hash).limit(1).get()
        return bool(by_hash)
    # Demo store
    for c in _demo_candidates.values():
        if c.get("email") == email or c.get("file_hash") == file_hash:
            return True
    return False


def save_candidate(data: dict) -> str:
    candidate_id = str(uuid.uuid4())
    data["candidate_id"] = candidate_id
    data["upload_date"]  = datetime.utcnow().isoformat()
    if _is_firebase_available():
        get_db().collection("candidates").document(candidate_id).set(data)
    else:
        _demo_candidates[candidate_id] = data
    return candidate_id


def get_all_candidates(
    score_min: float = 0,
    job_role_id: Optional[str] = None,
    skill_filter: Optional[str] = None,
) -> List[dict]:
    if _is_firebase_available():
        db   = get_db()
        query = db.collection("candidates")
        docs  = query.stream()
        results = [d.to_dict() for d in docs]
    else:
        results = list(_demo_candidates.values())

    # Apply filters in-memory
    if score_min > 0:
        results = [c for c in results if c.get("score", 0) >= score_min]
    if job_role_id:
        results = [c for c in results if c.get("job_role_id") == job_role_id]
    if skill_filter:
        results = [c for c in results if skill_filter.lower() in [s.lower() for s in c.get("detected_skills", [])]]

    return sorted(results, key=lambda x: x.get("score", 0), reverse=True)


def get_candidate_by_id(candidate_id: str) -> Optional[dict]:
    if _is_firebase_available():
        doc = get_db().collection("candidates").document(candidate_id).get()
        return doc.to_dict() if doc.exists else None
    return _demo_candidates.get(candidate_id)


def get_analytics() -> dict:
    candidates = get_all_candidates()
    if not candidates:
        return {
            "total_resumes": 0, "total_analyzed": 0, "avg_score": 0,
            "top_skills": [], "score_distribution": {"0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0},
            "upload_trend": [], "top_candidates": [],
        }

    total    = len(candidates)
    avg      = round(sum(c.get("score", 0) for c in candidates) / total, 1)

    # Skill frequency
    skill_freq: Dict[str, int] = {}
    for c in candidates:
        for s in c.get("detected_skills", []):
            skill_freq[s] = skill_freq.get(s, 0) + 1
    top_skills = sorted([{"skill": k, "count": v} for k, v in skill_freq.items()], key=lambda x: -x["count"])[:10]

    # Score distribution
    dist = {"0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    for c in candidates:
        s = c.get("score", 0)
        if s < 40:   dist["0-40"]   += 1
        elif s < 60: dist["40-60"]  += 1
        elif s < 80: dist["60-80"]  += 1
        else:        dist["80-100"] += 1

    top_candidates = [
        {
            "candidate_id": c.get("candidate_id"),
            "name":         c.get("name"),
            "score":        c.get("score"),
            "job_role":     c.get("job_role"),
            "matched":      len(c.get("matched_skills", [])),
        }
        for c in candidates[:5]
    ]

    # ── Achievement Intelligence analytics (v1.1) ───────────────────────────
    def _freq_count(candidates, field: str, top_n: int = 10):
        freq: Dict[str, int] = {}
        for c in candidates:
            for item in c.get(field, []):
                if item:
                    freq[item] = freq.get(item, 0) + 1
        return sorted(
            [{"name": k, "count": v} for k, v in freq.items()],
            key=lambda x: -x["count"],
        )[:top_n]

    top_projects       = _freq_count(candidates, "projects")
    top_certifications = _freq_count(candidates, "certifications")
    top_achievements   = _freq_count(candidates, "achievements")

    return {
        "total_resumes":      total,
        "total_analyzed":     total,
        "avg_score":          avg,
        "top_skills":         top_skills,
        "score_distribution": dist,
        "upload_trend":       [],
        "top_candidates":     top_candidates,
        "top_projects":       top_projects,
        "top_certifications": top_certifications,
        "top_achievements":   top_achievements,
    }


# ── Resume Storage ─────────────────────────────────────────────────────────────

def upload_resume_to_storage(file_bytes: bytes, filename: str) -> str:
    """Upload PDF to Firebase Storage and return public URL."""
    bucket = get_bucket()
    if bucket is None:
        return ""  # No storage in demo mode
    blob = bucket.blob(f"resumes/{filename}")
    blob.upload_from_string(file_bytes, content_type="application/pdf")
    blob.make_public()
    return blob.public_url


def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()
