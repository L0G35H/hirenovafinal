"""
TalentLens – Admin Authentication Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from models import AdminLogin, TokenResponse
from config import ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRY_HOURS
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])
security = HTTPBearer()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_admin_credentials(username: str, password: str):
    """Verify admin username and password against environment config"""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token from Authorization header"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"username": username, "role": payload.get("role", "admin")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/login", response_model=TokenResponse)
async def admin_login(credentials: AdminLogin):
    """Admin login endpoint - returns JWT token"""
    if not verify_admin_credentials(credentials.username, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    access_token = create_access_token(
        data={"sub": credentials.username, "role": "admin"}
    )
    return TokenResponse(access_token=access_token, token_type="bearer")

@router.get("/me")
async def get_me(user: dict = Depends(verify_jwt_token)):
    return {"user": user, "status": "authenticated"}

