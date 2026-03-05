"""
TalentLens – Pydantic Data Models
"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict
from datetime import datetime


class AdminLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class JobRoleCreate(BaseModel):
    role_name: str
    description: Optional[str] = ""
    required_skills: List[str]
    min_score_threshold: float = Field(default=60.0, ge=0, le=100)
    experience_required: Optional[str] = "Any"


class JobRoleResponse(JobRoleCreate):
    id: str
    created_at: Optional[str] = None


class CandidateCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    education: Optional[str] = ""
    experience: Optional[str] = ""
    job_role_id: str


class SkillAnalysis(BaseModel):
    detected_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    score: float
    skill_categories: Dict[str, List[str]]
    # Achievement Intelligence fields (added v1.1)
    projects: List[str] = []
    certifications: List[str] = []
    achievements: List[str] = []


class CandidateResponse(BaseModel):
    candidate_id: str
    name: str
    email: str
    phone: str
    education: str
    experience: str
    resume_url: str
    detected_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    score: float
    job_role: str
    job_role_id: str
    upload_date: str
    file_hash: str
    # Achievement Intelligence fields (added v1.1)
    projects: List[str] = []
    certifications: List[str] = []
    achievements: List[str] = []
    extraction_method: Optional[str] = None
    skill_categories: Optional[Dict[str, List[str]]] = None


class UploadResponse(BaseModel):
    success: bool
    message: str
    candidate_id: Optional[str] = None
    analysis: Optional[SkillAnalysis] = None
    candidate_name: Optional[str] = None
    score: Optional[float] = None


class AnalyticsResponse(BaseModel):
    total_resumes: int
    total_analyzed: int
    avg_score: float
    top_skills: List[Dict]
    score_distribution: Dict[str, int]
    upload_trend: List[Dict]
    top_candidates: List[Dict]
    # Achievement Intelligence analytics (added v1.1)
    top_projects: List[Dict] = []
    top_certifications: List[Dict] = []
    top_achievements: List[Dict] = []
