"""
TalentLens – Job Role Management Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from models import JobRoleCreate, JobRoleResponse

import firebase_service as fs

router = APIRouter(prefix="/api/jobs", tags=["Job Roles"])


@router.get("", response_model=List[dict])
async def list_job_roles():
    """Public endpoint – anyone can see available job roles."""
    return fs.get_job_roles()


@router.post("", response_model=dict)
async def create_job_role(body: JobRoleCreate):
    data   = body.model_dump()
    job_id = fs.save_job_role(data)
    return {"id": job_id, **data}


@router.get("/{job_id}", response_model=dict)
async def get_job_role(job_id: str):
    job = fs.get_job_role_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job role not found")
    return job


@router.put("/{job_id}", response_model=dict)
async def update_job_role(job_id: str, body: JobRoleCreate):
    data    = body.model_dump()
    updated = fs.update_job_role(job_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Job role not found")
    return {"id": job_id, **data}


@router.delete("/{job_id}")
async def delete_job_role(job_id: str):
    deleted = fs.delete_job_role(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job role not found")
    return {"message": "Job role deleted successfully"}
