"""
TalentLens – Skill Matching Algorithm & Score Calculation
"""
from typing import List, Dict


def match_skills(
    detected_skills: List[str],
    required_skills: List[str],
    min_threshold: float = 0.0,
) -> Dict:
    """
    Compare detected skills from resume against required skills for a job role.

    Returns:
        {
            'matched_skills': [...],
            'missing_skills': [...],
            'score': float (0-100),
            'qualified': bool,
        }
    """
    if not required_skills:
        return {
            "matched_skills": [],
            "missing_skills": [],
            "score": 0.0,
            "qualified": False,
        }

    # Normalize to lowercase for comparison
    detected_lower  = {s.lower(): s for s in detected_skills}
    required_lower  = {s.lower(): s for s in required_skills}

    matched = []
    missing = []

    for req_lower, req_original in required_lower.items():
        if req_lower in detected_lower:
            matched.append(req_original)
        else:
            missing.append(req_original)

    score     = round((len(matched) / len(required_skills)) * 100, 1)
    qualified = score >= min_threshold

    return {
        "matched_skills": matched,
        "missing_skills": missing,
        "score":          score,
        "qualified":      qualified,
    }


def generate_score_badge(score: float) -> str:
    """Return badge color class based on score."""
    if score >= 80:
        return "excellent"
    elif score >= 60:
        return "good"
    elif score >= 40:
        return "average"
    return "poor"
