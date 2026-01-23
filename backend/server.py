from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, Form, Query, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import FileResponse, StreamingResponse, Response
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import aiofiles
import json
import base64
import io
import zipfile
import subprocess
import tempfile
import hashlib
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Dossier Juridique Intelligent")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get("JWT_SECRET", "legal-dossier-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
EXPORTS_DIR = ROOT_DIR / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)

# Config
MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "50"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_CONCURRENT_ANALYSES = 2  # Per dossier
ANALYSIS_RATE_LIMIT_SECONDS = 2  # Min seconds between analysis requests

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Analysis queue lock (simple in-memory for now)
analysis_locks = {}

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DossierCreate(BaseModel):
    title: str
    description: Optional[str] = ""

class DossierUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class DossierResponse(BaseModel):
    id: str
    title: str
    description: str
    user_id: str
    created_at: str
    updated_at: str
    piece_count: int = 0

class AIProposal(BaseModel):
    type_piece: str
    type_confidence: str
    date_document: Optional[str] = None
    date_confidence: str = "faible"
    titre: str
    titre_confidence: str = "moyen"
    resume_qui: Optional[str] = None
    resume_quoi: Optional[str] = None
    resume_ou: Optional[str] = None
    resume_element_cle: Optional[str] = None
    mots_cles: List[str] = []
    extrait_justificatif: Optional[str] = None

class PieceValidation(BaseModel):
    type_piece: str
    date_document: Optional[str] = None
    titre: str
    resume_qui: Optional[str] = None
    resume_quoi: Optional[str] = None
    resume_ou: Optional[str] = None
    resume_element_cle: Optional[str] = None
    mots_cles: List[str] = []

class PieceResponse(BaseModel):
    id: str
    dossier_id: str
    numero: int
    filename: str
    original_filename: str
    file_type: str
    file_size: int = 0
    file_hash: Optional[str] = None
    is_duplicate: bool = False
    status: str
    analysis_status: str = "pending"  # pending, queued, analyzing, complete, error
    analysis_error: Optional[str] = None
    analysis_queued_at: Optional[str] = None
    analysis_started_at: Optional[str] = None
    analysis_completed_at: Optional[str] = None
    ai_proposal: Optional[AIProposal] = None
    validated_data: Optional[PieceValidation] = None
    created_at: str
    updated_at: str

class ShareLinkCreate(BaseModel):
    dossier_id: str
    expires_in_days: int = 7

class ShareLinkResponse(BaseModel):
    id: str
    dossier_id: str
    token: str
    expires_at: str
    created_at: str

class AssistantRequest(BaseModel):
    document_type: str
    jurisdiction: Optional[str] = None
    piece_ids: List[str] = []
    date_start: Optional[str] = None
    date_end: Optional[str] = None

class AssistantResponse(BaseModel):
    content: str
    pieces_used: List[int]
    warnings: List[str] = []

class DeleteManyRequest(BaseModel):
    piece_ids: List[str]

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    existing_piece_id: Optional[str] = None
    existing_piece_numero: Optional[int] = None

class QueueAnalysisRequest(BaseModel):
    piece_ids: List[str] = []  # Empty = all pending pieces

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def compute_file_hash(content: bytes) -> str:
    """Compute SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=data.email, name=data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])

# ===================== DOSSIER ROUTES =====================

@api_router.post("/dossiers", response_model=DossierResponse)
async def create_dossier(data: DossierCreate, user: dict = Depends(get_current_user)):
    dossier_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    dossier_doc = {
        "id": dossier_id,
        "title": data.title,
        "description": data.description or "",
        "user_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.dossiers.insert_one(dossier_doc)
    return DossierResponse(**dossier_doc, piece_count=0)

@api_router.get("/dossiers", response_model=List[DossierResponse])
async def list_dossiers(user: dict = Depends(get_current_user)):
    dossiers = await db.dossiers.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    result = []
    for d in dossiers:
        count = await db.pieces.count_documents({"dossier_id": d["id"]})
        result.append(DossierResponse(**d, piece_count=count))
    return result

@api_router.get("/dossiers/{dossier_id}", response_model=DossierResponse)
async def get_dossier(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]}, {"_id": 0})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    count = await db.pieces.count_documents({"dossier_id": dossier_id})
    return DossierResponse(**dossier, piece_count=count)

@api_router.put("/dossiers/{dossier_id}", response_model=DossierResponse)
async def update_dossier(dossier_id: str, data: DossierUpdate, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title is not None:
        update_data["title"] = data.title
    if data.description is not None:
        update_data["description"] = data.description
    
    await db.dossiers.update_one({"id": dossier_id}, {"$set": update_data})
    dossier = await db.dossiers.find_one({"id": dossier_id}, {"_id": 0})
    count = await db.pieces.count_documents({"dossier_id": dossier_id})
    return DossierResponse(**dossier, piece_count=count)

@api_router.delete("/dossiers/{dossier_id}")
async def delete_dossier(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id}).to_list(1000)
    for piece in pieces:
        filepath = UPLOAD_DIR / piece["filename"]
        if filepath.exists():
            filepath.unlink()
    
    await db.pieces.delete_many({"dossier_id": dossier_id})
    await db.share_links.delete_many({"dossier_id": dossier_id})
    await db.dossiers.delete_one({"id": dossier_id})
    return {"message": "Dossier deleted"}

# ===================== FILE PROCESSING =====================

def convert_heic_to_jpg(filepath: Path) -> Path:
    """Convert HEIC to JPG"""
    try:
        from PIL import Image
        from pillow_heif import register_heif_opener
        register_heif_opener()
        
        img = Image.open(filepath)
        new_path = filepath.with_suffix('.jpg')
        img.convert('RGB').save(new_path, 'JPEG', quality=95)
        filepath.unlink()
        return new_path
    except Exception as e:
        logger.error(f"HEIC conversion error: {e}")
        return filepath

def extract_text_from_docx(filepath: Path) -> str:
    """Extract text from DOCX file"""
    try:
        from docx import Document
        doc = Document(filepath)
        text_parts = []
        for para in doc.paragraphs:
            text_parts.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text_parts.append(cell.text)
        return "\n".join(text_parts)
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""

def extract_text_from_doc(filepath: Path) -> str:
    """Extract text from DOC file using antiword or fallback"""
    try:
        result = subprocess.run(['antiword', str(filepath)], capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return result.stdout
    except Exception:
        pass
    return ""

def extract_text_from_pdf(filepath: Path) -> str:
    """Extract text from PDF"""
    try:
        from pypdf import PdfReader
        reader = PdfReader(filepath)
        text_parts = []
        for page in reader.pages[:50]:
            text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""

# ===================== PIECE ROUTES =====================

@api_router.post("/dossiers/{dossier_id}/check-duplicate")
async def check_duplicate(
    dossier_id: str, 
    file: UploadFile = File(...), 
    user: dict = Depends(get_current_user)
):
    """Check if a file is a duplicate before uploading"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    content = await file.read()
    file_hash = compute_file_hash(content)
    
    existing = await db.pieces.find_one(
        {"dossier_id": dossier_id, "file_hash": file_hash},
        {"_id": 0}
    )
    
    if existing:
        return DuplicateCheckResponse(
            is_duplicate=True,
            existing_piece_id=existing["id"],
            existing_piece_numero=existing["numero"]
        )
    
    return DuplicateCheckResponse(is_duplicate=False)

@api_router.post("/dossiers/{dossier_id}/pieces", response_model=PieceResponse)
async def upload_piece(
    dossier_id: str, 
    file: UploadFile = File(...),
    force_upload: bool = Query(False, description="Upload even if duplicate"),
    user: dict = Depends(get_current_user)
):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Fichier trop volumineux (max {MAX_FILE_SIZE_MB} MB)")
    
    # Compute hash for duplicate detection
    file_hash = compute_file_hash(content)
    
    # Check for duplicate
    is_duplicate = False
    existing = await db.pieces.find_one({"dossier_id": dossier_id, "file_hash": file_hash})
    if existing:
        is_duplicate = True
        if not force_upload:
            raise HTTPException(
                status_code=409, 
                detail=f"Fichier identique déjà présent (Pièce {existing['numero']}). Utilisez force_upload=true pour importer quand même."
            )
    
    # Get next piece number
    last_piece = await db.pieces.find_one({"dossier_id": dossier_id}, sort=[("numero", -1)])
    next_numero = (last_piece["numero"] + 1) if last_piece else 1
    
    # Determine file type
    ext = Path(file.filename).suffix.lower()
    file_type_map = {
        ".pdf": "pdf", ".jpg": "image", ".jpeg": "image", ".png": "image",
        ".docx": "docx", ".doc": "doc", ".heic": "heic", ".heif": "heic"
    }
    file_type = file_type_map.get(ext, "other")
    
    # Save file
    piece_id = str(uuid.uuid4())
    filename = f"{piece_id}{ext}"
    filepath = UPLOAD_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(content)
    
    # Convert HEIC if needed
    if file_type == "heic":
        filepath = convert_heic_to_jpg(filepath)
        filename = filepath.name
        file_type = "image"
    
    now = datetime.now(timezone.utc).isoformat()
    piece_doc = {
        "id": piece_id,
        "dossier_id": dossier_id,
        "numero": next_numero,
        "filename": filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "file_size": file_size,
        "file_hash": file_hash,
        "is_duplicate": is_duplicate,
        "status": "a_verifier",
        "analysis_status": "pending",
        "analysis_error": None,
        "analysis_queued_at": None,
        "analysis_started_at": None,
        "analysis_completed_at": None,
        "ai_proposal": None,
        "validated_data": None,
        "extracted_text": None,
        "created_at": now,
        "updated_at": now
    }
    await db.pieces.insert_one(piece_doc)
    
    return PieceResponse(**{k: v for k, v in piece_doc.items() if k != "extracted_text"})

@api_router.get("/dossiers/{dossier_id}/pieces", response_model=List[PieceResponse])
async def list_pieces(
    dossier_id: str, 
    filter_duplicates: bool = Query(False),
    filter_errors: bool = Query(False),
    user: dict = Depends(get_current_user)
):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    query = {"dossier_id": dossier_id}
    if filter_duplicates:
        query["is_duplicate"] = True
    if filter_errors:
        query["analysis_status"] = "error"
    
    pieces = await db.pieces.find(query, {"_id": 0, "extracted_text": 0}).sort("numero", 1).to_list(1000)
    return [PieceResponse(**p) for p in pieces]

@api_router.get("/pieces/{piece_id}", response_model=PieceResponse)
async def get_piece(piece_id: str, user: dict = Depends(get_current_user)):
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0, "extracted_text": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return PieceResponse(**piece)

@api_router.get("/pieces/{piece_id}/file")
async def get_piece_file(piece_id: str, user: dict = Depends(get_current_user)):
    """Download piece file with proper authentication"""
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = UPLOAD_DIR / piece["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        filepath, 
        filename=piece["original_filename"],
        media_type="application/octet-stream"
    )

@api_router.get("/pieces/{piece_id}/preview")
async def preview_piece_file(piece_id: str, user: dict = Depends(get_current_user)):
    """Get file content for inline preview (PDF/images)"""
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = UPLOAD_DIR / piece["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = Path(piece["filename"]).suffix.lower()
    content_types = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    content_type = content_types.get(ext, "application/octet-stream")
    
    async with aiofiles.open(filepath, 'rb') as f:
        content = await f.read()
    
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{piece["original_filename"]}"'
        }
    )

# ===================== ANALYSIS QUEUE =====================

@api_router.post("/dossiers/{dossier_id}/queue-analysis")
async def queue_analysis(
    dossier_id: str, 
    request: QueueAnalysisRequest,
    user: dict = Depends(get_current_user)
):
    """Queue pieces for analysis (instead of analyzing all at once)"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    # Build query
    query = {"dossier_id": dossier_id}
    if request.piece_ids:
        query["id"] = {"$in": request.piece_ids}
    else:
        # Only queue pieces that haven't been analyzed or had errors
        query["analysis_status"] = {"$in": ["pending", "error"]}
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.pieces.update_many(
        query,
        {"$set": {
            "analysis_status": "queued",
            "analysis_queued_at": now,
            "analysis_error": None,
            "updated_at": now
        }}
    )
    
    return {
        "message": f"{result.modified_count} pièces ajoutées à la file d'attente",
        "queued_count": result.modified_count
    }

@api_router.post("/dossiers/{dossier_id}/queue-failed")
async def queue_failed_analyses(dossier_id: str, user: dict = Depends(get_current_user)):
    """Re-queue all failed analyses"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.pieces.update_many(
        {"dossier_id": dossier_id, "analysis_status": "error"},
        {"$set": {
            "analysis_status": "queued",
            "analysis_queued_at": now,
            "analysis_error": None,
            "updated_at": now
        }}
    )
    
    return {
        "message": f"{result.modified_count} pièces en échec remises en file d'attente",
        "queued_count": result.modified_count
    }

@api_router.post("/dossiers/{dossier_id}/process-queue")
async def process_analysis_queue(dossier_id: str, user: dict = Depends(get_current_user)):
    """Process queued analyses with rate limiting"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    # Check rate limit (simple implementation)
    lock_key = f"analysis_{dossier_id}"
    now = datetime.now(timezone.utc)
    
    if lock_key in analysis_locks:
        last_run = analysis_locks[lock_key]
        if (now - last_run).total_seconds() < ANALYSIS_RATE_LIMIT_SECONDS:
            return {"message": "Veuillez patienter quelques secondes avant de relancer", "processed": 0}
    
    analysis_locks[lock_key] = now
    
    # Count currently analyzing
    analyzing_count = await db.pieces.count_documents({
        "dossier_id": dossier_id,
        "analysis_status": "analyzing"
    })
    
    # Calculate how many we can process
    slots_available = MAX_CONCURRENT_ANALYSES - analyzing_count
    if slots_available <= 0:
        return {"message": "Analyses en cours, veuillez patienter", "processed": 0}
    
    # Get queued pieces
    queued_pieces = await db.pieces.find(
        {"dossier_id": dossier_id, "analysis_status": "queued"},
        {"_id": 0}
    ).sort("analysis_queued_at", 1).limit(slots_available).to_list(slots_available)
    
    processed = 0
    for piece in queued_pieces:
        try:
            # Mark as analyzing
            await db.pieces.update_one(
                {"id": piece["id"]},
                {"$set": {
                    "analysis_status": "analyzing",
                    "analysis_started_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Perform analysis
            filepath = UPLOAD_DIR / piece["filename"]
            ai_proposal = await analyze_document_with_ai(
                filepath, piece["file_type"], piece["original_filename"], piece["id"]
            )
            
            # Update with results
            await db.pieces.update_one(
                {"id": piece["id"]},
                {"$set": {
                    "ai_proposal": ai_proposal,
                    "analysis_status": "complete",
                    "analysis_completed_at": datetime.now(timezone.utc).isoformat(),
                    "analysis_error": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            processed += 1
            
        except Exception as e:
            logger.error(f"Analysis failed for piece {piece['id']}: {e}")
            await db.pieces.update_one(
                {"id": piece["id"]},
                {"$set": {
                    "analysis_status": "error",
                    "analysis_error": str(e)[:500],
                    "analysis_completed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # Check if more in queue
    remaining = await db.pieces.count_documents({
        "dossier_id": dossier_id,
        "analysis_status": "queued"
    })
    
    return {
        "message": f"{processed} analyse(s) terminée(s)",
        "processed": processed,
        "remaining_in_queue": remaining
    }

@api_router.get("/dossiers/{dossier_id}/queue-status")
async def get_queue_status(dossier_id: str, user: dict = Depends(get_current_user)):
    """Get current analysis queue status"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pending = await db.pieces.count_documents({"dossier_id": dossier_id, "analysis_status": "pending"})
    queued = await db.pieces.count_documents({"dossier_id": dossier_id, "analysis_status": "queued"})
    analyzing = await db.pieces.count_documents({"dossier_id": dossier_id, "analysis_status": "analyzing"})
    complete = await db.pieces.count_documents({"dossier_id": dossier_id, "analysis_status": "complete"})
    error = await db.pieces.count_documents({"dossier_id": dossier_id, "analysis_status": "error"})
    
    return {
        "pending": pending,
        "queued": queued,
        "analyzing": analyzing,
        "complete": complete,
        "error": error,
        "total": pending + queued + analyzing + complete + error
    }

@api_router.post("/pieces/{piece_id}/analyze", response_model=PieceResponse)
async def analyze_piece(piece_id: str, user: dict = Depends(get_current_user)):
    """Analyze a single piece (with rate limiting)"""
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Rate limit check
    lock_key = f"piece_{piece_id}"
    now = datetime.now(timezone.utc)
    
    if lock_key in analysis_locks:
        last_run = analysis_locks[lock_key]
        if (now - last_run).total_seconds() < ANALYSIS_RATE_LIMIT_SECONDS:
            raise HTTPException(status_code=429, detail="Veuillez patienter avant de relancer l'analyse")
    
    analysis_locks[lock_key] = now
    
    # Set status to analyzing
    await db.pieces.update_one(
        {"id": piece_id}, 
        {"$set": {
            "analysis_status": "analyzing",
            "analysis_started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    try:
        filepath = UPLOAD_DIR / piece["filename"]
        ai_proposal = await analyze_document_with_ai(filepath, piece["file_type"], piece["original_filename"], piece_id)
        
        await db.pieces.update_one(
            {"id": piece_id},
            {"$set": {
                "ai_proposal": ai_proposal,
                "analysis_status": "complete",
                "analysis_completed_at": datetime.now(timezone.utc).isoformat(),
                "analysis_error": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        await db.pieces.update_one(
            {"id": piece_id}, 
            {"$set": {
                "analysis_status": "error",
                "analysis_error": str(e)[:500],
                "analysis_completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0, "extracted_text": 0})
    return PieceResponse(**piece)

@api_router.post("/pieces/{piece_id}/reanalyze", response_model=PieceResponse)
async def reanalyze_piece(piece_id: str, user: dict = Depends(get_current_user)):
    """Re-analyze a piece (clear previous and retry)"""
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Rate limit check
    lock_key = f"piece_{piece_id}"
    now = datetime.now(timezone.utc)
    
    if lock_key in analysis_locks:
        last_run = analysis_locks[lock_key]
        if (now - last_run).total_seconds() < ANALYSIS_RATE_LIMIT_SECONDS:
            raise HTTPException(status_code=429, detail="Veuillez patienter avant de relancer l'analyse")
    
    analysis_locks[lock_key] = now
    
    # Clear previous analysis
    await db.pieces.update_one(
        {"id": piece_id},
        {"$set": {
            "ai_proposal": None, 
            "analysis_status": "analyzing", 
            "extracted_text": None,
            "analysis_error": None,
            "analysis_started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    try:
        filepath = UPLOAD_DIR / piece["filename"]
        ai_proposal = await analyze_document_with_ai(filepath, piece["file_type"], piece["original_filename"], piece_id)
        
        await db.pieces.update_one(
            {"id": piece_id},
            {"$set": {
                "ai_proposal": ai_proposal,
                "analysis_status": "complete",
                "analysis_completed_at": datetime.now(timezone.utc).isoformat(),
                "analysis_error": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    except Exception as e:
        logger.error(f"Re-analysis error: {e}")
        await db.pieces.update_one(
            {"id": piece_id}, 
            {"$set": {
                "analysis_status": "error",
                "analysis_error": str(e)[:500],
                "analysis_completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0, "extracted_text": 0})
    return PieceResponse(**piece)

@api_router.post("/pieces/{piece_id}/validate", response_model=PieceResponse)
async def validate_piece(piece_id: str, data: PieceValidation, user: dict = Depends(get_current_user)):
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.pieces.update_one(
        {"id": piece_id},
        {"$set": {
            "validated_data": data.model_dump(),
            "status": "pret",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0, "extracted_text": 0})
    return PieceResponse(**piece)

@api_router.delete("/pieces/{piece_id}")
async def delete_piece(piece_id: str, user: dict = Depends(get_current_user)):
    piece = await db.pieces.find_one({"id": piece_id})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = UPLOAD_DIR / piece["filename"]
    if filepath.exists():
        filepath.unlink()
    
    await db.pieces.delete_one({"id": piece_id})
    return {"message": "Piece deleted"}

@api_router.post("/dossiers/{dossier_id}/pieces/delete-many")
async def delete_many_pieces(
    dossier_id: str, 
    request: DeleteManyRequest,
    user: dict = Depends(get_current_user)
):
    """Delete multiple pieces at once"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    # Get pieces that belong to this dossier
    pieces = await db.pieces.find({
        "id": {"$in": request.piece_ids},
        "dossier_id": dossier_id
    }).to_list(len(request.piece_ids))
    
    deleted_count = 0
    for piece in pieces:
        filepath = UPLOAD_DIR / piece["filename"]
        if filepath.exists():
            filepath.unlink()
        await db.pieces.delete_one({"id": piece["id"]})
        deleted_count += 1
    
    return {"message": f"{deleted_count} pièces supprimées", "deleted_count": deleted_count}

@api_router.post("/dossiers/{dossier_id}/pieces/delete-errors")
async def delete_error_pieces(dossier_id: str, user: dict = Depends(get_current_user)):
    """Delete all pieces with analysis errors"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({
        "dossier_id": dossier_id,
        "analysis_status": "error"
    }).to_list(1000)
    
    deleted_count = 0
    for piece in pieces:
        filepath = UPLOAD_DIR / piece["filename"]
        if filepath.exists():
            filepath.unlink()
        await db.pieces.delete_one({"id": piece["id"]})
        deleted_count += 1
    
    return {"message": f"{deleted_count} pièces en erreur supprimées", "deleted_count": deleted_count}

@api_router.post("/dossiers/{dossier_id}/renumber")
async def renumber_pieces(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id}).sort("numero", 1).to_list(1000)
    for i, piece in enumerate(pieces, 1):
        await db.pieces.update_one({"id": piece["id"]}, {"$set": {"numero": i}})
    
    return {"message": "Pieces renumbered"}

# ===================== AI ANALYSIS =====================

async def analyze_document_with_ai(filepath: Path, file_type: str, original_filename: str, piece_id: str) -> dict:
    """Analyze document using Gemini Vision"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.error("EMERGENT_LLM_KEY not set")
        raise Exception("Configuration serveur incomplète (clé API manquante)")
    
    try:
        # Extract text for DOCX/DOC files first
        extracted_text = None
        if file_type == "docx":
            extracted_text = extract_text_from_docx(filepath)
        elif file_type == "doc":
            extracted_text = extract_text_from_doc(filepath)
        elif file_type == "pdf":
            extracted_text = extract_text_from_pdf(filepath)
        
        # Store extracted text
        if extracted_text:
            await db.pieces.update_one({"id": piece_id}, {"$set": {"extracted_text": extracted_text[:50000]}})
        
        system_message = """Tu es un assistant juridique expert. Analyse ce document juridique et extrais les informations suivantes de manière structurée.

IMPORTANT:
- N'invente JAMAIS d'information. Si tu ne trouves pas une information, indique "Non identifié".
- Pour chaque information, indique un niveau de confiance: "faible", "moyen", ou "fort".
- Cite un extrait du document (max 200 caractères) qui justifie ta proposition.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "type_piece": "plainte|main_courante|certificat_medical|attestation|sms|conclusions|assignation|recit|facture|contrat|jugement|ordonnance|autre",
  "type_confidence": "faible|moyen|fort",
  "date_document": "YYYY-MM-DD ou null si non trouvée",
  "date_confidence": "faible|moyen|fort",
  "titre": "titre clair et standardisé",
  "titre_confidence": "faible|moyen|fort",
  "resume_qui": "personnes impliquées",
  "resume_quoi": "fait ou motif principal",
  "resume_ou": "lieu si mentionné ou null",
  "resume_element_cle": "diagnostic, menace, refus, constat, montant, décision, etc.",
  "mots_cles": ["mot1", "mot2", "mot3"],
  "extrait_justificatif": "extrait du document justifiant l'analyse (max 200 car.)"
}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"analysis-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        # For text-based files with extracted text, send the text
        if extracted_text and len(extracted_text) > 100:
            user_message = UserMessage(
                text=f"Analyse ce document juridique (nom: {original_filename}).\n\nContenu extrait:\n{extracted_text[:30000]}"
            )
        else:
            # For images and PDFs, use vision
            mime_map = {
                "pdf": "application/pdf",
                "image": "image/jpeg" if filepath.suffix.lower() in [".jpg", ".jpeg"] else "image/png",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
            mime_type = mime_map.get(file_type, "application/octet-stream")
            
            file_content = FileContentWithMimeType(
                file_path=str(filepath),
                mime_type=mime_type
            )
            
            user_message = UserMessage(
                text=f"Analyse ce document juridique (nom original: {original_filename}). Extrais toutes les informations pertinentes.",
                file_contents=[file_content]
            )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        proposal = json.loads(response_text.strip())
        return proposal
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        raise Exception(f"Erreur de parsing de la réponse IA")
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise

# ===================== CHRONOLOGY & EXPORTS =====================

@api_router.get("/dossiers/{dossier_id}/chronology")
async def get_chronology(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id, "status": "pret"}, {"_id": 0}).to_list(1000)
    
    chronology = []
    for p in pieces:
        if p.get("validated_data"):
            date_doc = p["validated_data"].get("date_document")
            chronology.append({
                "piece_id": p["id"],
                "numero": p["numero"],
                "date": date_doc,
                "titre": p["validated_data"].get("titre", p["original_filename"]),
                "resume": {
                    "qui": p["validated_data"].get("resume_qui"),
                    "quoi": p["validated_data"].get("resume_quoi"),
                    "ou": p["validated_data"].get("resume_ou"),
                    "element_cle": p["validated_data"].get("resume_element_cle")
                },
                "type_piece": p["validated_data"].get("type_piece")
            })
    
    chronology.sort(key=lambda x: x["date"] or "9999-99-99")
    
    return {"dossier": dossier["title"], "dossier_id": dossier_id, "entries": chronology}

@api_router.get("/dossiers/{dossier_id}/export/csv")
async def export_csv(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id}, {"_id": 0}).sort("numero", 1).to_list(1000)
    
    csv_content = "N°;Type;Date;Titre;Résumé\n"
    for p in pieces:
        data = p.get("validated_data") or {}
        resume_parts = [data.get("resume_qui", ""), data.get("resume_quoi", ""), data.get("resume_element_cle", "")]
        resume = " - ".join([r for r in resume_parts if r])
        csv_content += f"Pièce {p['numero']};{data.get('type_piece', '')};{data.get('date_document', '')};{data.get('titre', p['original_filename'])};{resume}\n"
    
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=sommaire_{dossier_id}.csv"}
    )

@api_router.get("/dossiers/{dossier_id}/export/zip")
async def export_zip(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id}, {"_id": 0}).sort("numero", 1).to_list(1000)
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for p in pieces:
            filepath = UPLOAD_DIR / p["filename"]
            if filepath.exists():
                ext = Path(p["original_filename"]).suffix
                arcname = f"Piece_{p['numero']}{ext}"
                zf.write(filepath, arcname)
    
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=dossier_{dossier_id}.zip"}
    )

# ===================== PDF EXPORT =====================

def format_date_fr(date_str: str) -> str:
    """Format date to DD/MM/YYYY"""
    if not date_str:
        return "Date non définie"
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y")
    except:
        try:
            parts = date_str.split("-")
            if len(parts) == 3:
                return f"{parts[2]}/{parts[1]}/{parts[0]}"
        except:
            pass
        return date_str

@api_router.get("/dossiers/{dossier_id}/export/pdf")
async def export_chronology_pdf(dossier_id: str, user: dict = Depends(get_current_user)):
    """Export chronology as professional PDF"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]}, {"_id": 0})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id, "status": "pret"}, {"_id": 0}).to_list(1000)
    
    # Build chronology
    chronology = []
    for p in pieces:
        if p.get("validated_data"):
            chronology.append({
                "numero": p["numero"],
                "date": p["validated_data"].get("date_document"),
                "titre": p["validated_data"].get("titre", p["original_filename"]),
                "type_piece": p["validated_data"].get("type_piece", "autre"),
                "resume": p["validated_data"]
            })
    chronology.sort(key=lambda x: x["date"] or "9999-99-99")
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Title_Custom', fontName='Helvetica-Bold', fontSize=16, alignment=TA_CENTER, spaceAfter=20))
    styles.add(ParagraphStyle(name='Subtitle', fontName='Helvetica', fontSize=10, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=30))
    styles.add(ParagraphStyle(name='Entry_Date', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0369A1')))
    styles.add(ParagraphStyle(name='Entry_Title', fontName='Helvetica-Bold', fontSize=10, spaceAfter=5))
    styles.add(ParagraphStyle(name='Entry_Body', fontName='Helvetica', fontSize=9, alignment=TA_JUSTIFY, spaceAfter=3))
    styles.add(ParagraphStyle(name='Entry_Ref', fontName='Helvetica-Oblique', fontSize=8, textColor=colors.grey, spaceAfter=15))
    
    elements = []
    
    # Header
    elements.append(Paragraph(f"CHRONOLOGIE DES FAITS", styles['Title_Custom']))
    elements.append(Paragraph(f"Dossier : {dossier['title']}", styles['Subtitle']))
    elements.append(Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", styles['Subtitle']))
    elements.append(Spacer(1, 20))
    
    if not chronology:
        elements.append(Paragraph("Aucune pièce validée dans ce dossier.", styles['Entry_Body']))
    else:
        for entry in chronology:
            # Date
            date_str = format_date_fr(entry["date"])
            elements.append(Paragraph(f"• {date_str}", styles['Entry_Date']))
            
            # Title
            elements.append(Paragraph(entry["titre"], styles['Entry_Title']))
            
            # Resume
            resume = entry["resume"]
            resume_parts = []
            if resume.get("resume_qui"):
                resume_parts.append(f"<b>Qui :</b> {resume['resume_qui']}")
            if resume.get("resume_quoi"):
                resume_parts.append(f"<b>Quoi :</b> {resume['resume_quoi']}")
            if resume.get("resume_ou"):
                resume_parts.append(f"<b>Où :</b> {resume['resume_ou']}")
            if resume.get("resume_element_cle"):
                resume_parts.append(f"<b>Élément clé :</b> {resume['resume_element_cle']}")
            
            for part in resume_parts:
                elements.append(Paragraph(part, styles['Entry_Body']))
            
            # Reference
            elements.append(Paragraph(f"Référence : Pièce {entry['numero']}", styles['Entry_Ref']))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=chronologie_{dossier_id}.pdf"}
    )

@api_router.get("/dossiers/{dossier_id}/export/docx")
async def export_chronology_docx(dossier_id: str, user: dict = Depends(get_current_user)):
    """Export chronology as DOCX narrative"""
    from docx import Document
    from docx.shared import Pt, Inches, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]}, {"_id": 0})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id, "status": "pret"}, {"_id": 0}).to_list(1000)
    
    # Build chronology
    chronology = []
    for p in pieces:
        if p.get("validated_data"):
            chronology.append({
                "numero": p["numero"],
                "date": p["validated_data"].get("date_document"),
                "titre": p["validated_data"].get("titre", p["original_filename"]),
                "type_piece": p["validated_data"].get("type_piece", "autre"),
                "resume": p["validated_data"]
            })
    chronology.sort(key=lambda x: x["date"] or "9999-99-99")
    
    # Create DOCX
    doc = Document()
    
    # Title
    title = doc.add_heading('CHRONOLOGIE NARRATIVE DES FAITS', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Subtitle
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run(f"Dossier : {dossier['title']}\nGénéré le {datetime.now().strftime('%d/%m/%Y')}")
    run.font.size = Pt(10)
    
    doc.add_paragraph()
    
    if not chronology:
        doc.add_paragraph("Aucune pièce validée dans ce dossier.")
    else:
        for entry in chronology:
            date_str = format_date_fr(entry["date"])
            resume = entry["resume"]
            
            # Build narrative paragraph
            para = doc.add_paragraph()
            
            # Date in bold
            run = para.add_run(f"Le {date_str}, ")
            run.bold = True
            
            # Build narrative text
            narrative_parts = []
            if resume.get("resume_qui"):
                narrative_parts.append(resume["resume_qui"])
            if resume.get("resume_quoi"):
                narrative_parts.append(resume["resume_quoi"].lower() if resume.get("resume_qui") else resume["resume_quoi"])
            if resume.get("resume_ou"):
                narrative_parts.append(f"à {resume['resume_ou']}")
            
            narrative = " ".join(narrative_parts) if narrative_parts else entry["titre"]
            para.add_run(narrative)
            
            if resume.get("resume_element_cle"):
                para.add_run(f". {resume['resume_element_cle']}")
            
            # Reference
            ref_run = para.add_run(f" (Pièce {entry['numero']})")
            ref_run.italic = True
            
            para.add_run(".")
    
    # Save to buffer
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=chronologie_narrative_{dossier_id}.docx"}
    )

# ===================== ASSISTANT DE RÉDACTION =====================

@api_router.post("/dossiers/{dossier_id}/assistant", response_model=AssistantResponse)
async def generate_document(dossier_id: str, request: AssistantRequest, user: dict = Depends(get_current_user)):
    """Generate document draft based on VALIDATED pieces only"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]}, {"_id": 0})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    # Get validated pieces only
    query = {"dossier_id": dossier_id, "status": "pret"}
    if request.piece_ids:
        query["id"] = {"$in": request.piece_ids}
    
    pieces = await db.pieces.find(query, {"_id": 0}).sort("numero", 1).to_list(1000)
    
    # Filter by date if provided
    if request.date_start or request.date_end:
        filtered = []
        for p in pieces:
            date_doc = p.get("validated_data", {}).get("date_document")
            if date_doc:
                if request.date_start and date_doc < request.date_start:
                    continue
                if request.date_end and date_doc > request.date_end:
                    continue
            filtered.append(p)
        pieces = filtered
    
    if not pieces:
        return AssistantResponse(
            content="Aucune pièce validée disponible pour générer ce document.",
            pieces_used=[],
            warnings=["Aucune pièce sélectionnée ou toutes les pièces sont encore 'à vérifier'."]
        )
    
    # Build context from validated data ONLY
    context_parts = []
    pieces_used = []
    for p in pieces:
        vd = p.get("validated_data", {})
        if vd:
            pieces_used.append(p["numero"])
            entry = f"""
Pièce {p['numero']} - {vd.get('titre', p['original_filename'])}:
- Type: {vd.get('type_piece', 'non défini')}
- Date: {format_date_fr(vd.get('date_document'))}
- Qui: {vd.get('resume_qui', 'Non précisé')}
- Quoi: {vd.get('resume_quoi', 'Non précisé')}
- Où: {vd.get('resume_ou', 'Non précisé')}
- Élément clé: {vd.get('resume_element_cle', 'Non précisé')}
"""
            context_parts.append(entry)
    
    context = "\n".join(context_parts)
    
    # Labels for jurisdictions
    jurisdiction_labels = {
        "jaf": "Juge aux Affaires Familiales (JAF)",
        "penal": "Pénal",
        "prudhommes": "Prud'hommes",
        "administratif": "Administratif",
        "civil": "Civil (Tribunal judiciaire)",
        "commercial": "Commercial",
        "autre": "Juridiction à préciser"
    }
    
    jurisdiction_label = jurisdiction_labels.get(request.jurisdiction, "Juridiction à préciser") if request.jurisdiction else None
    
    # Document type prompts (agnostique du contentieux)
    prompts = {
        "expose_faits": f"""À partir des informations VALIDÉES suivantes, rédige un exposé des faits structuré et chronologique.

RÈGLES STRICTES:
- N'invente AUCUNE information
- Chaque fait doit citer sa source: (Pièce X)
- Si une information manque, écris "À confirmer"
- Style: juridique, factuel, neutre

Pièces validées:
{context}

Rédige l'exposé des faits:""",
        
        "chronologie_narrative": f"""À partir des informations VALIDÉES suivantes, rédige une chronologie narrative.

RÈGLES STRICTES:
- Un paragraphe par événement
- Format: "Le [date], [fait]. (Pièce X)"
- N'invente AUCUNE information
- Si une date est manquante, l'indiquer

Pièces validées:
{context}

Rédige la chronologie narrative:""",
        
        "courrier_avocat": f"""À partir des informations VALIDÉES suivantes, rédige un projet de courrier pour un avocat présentant la situation.

RÈGLES STRICTES:
- Chaque fait cité doit référencer sa source: (Pièce X)
- N'invente AUCUNE information
- Mentionner les points nécessitant clarification
- Style: professionnel, synthétique

Pièces validées:
{context}

Rédige le projet de courrier:""",
        
        "projet_requete": f"""À partir des informations VALIDÉES suivantes, rédige un projet de requête.

JURIDICTION CIBLÉE: {jurisdiction_label}

RÈGLES STRICTES:
- Commence par "PROJET DE REQUÊTE – {jurisdiction_label}"
- Chaque fait cité doit référencer sa source: (Pièce X)
- N'invente AUCUNE information
- Structure adaptée à la juridiction: Faits, Discussion, Par ces motifs (ou structure équivalente selon la juridiction)
- Les informations manquantes doivent être signalées avec "À confirmer"
- Reste factuel et neutre, les faits proviennent uniquement des pièces validées

Pièces validées:
{context}

Rédige le projet de requête pour la juridiction {jurisdiction_label}:"""
    }
    
    prompt = prompts.get(request.document_type, prompts["expose_faits"])
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return AssistantResponse(
            content="Service d'assistant non disponible (clé API manquante).",
            pieces_used=pieces_used,
            warnings=["Configuration serveur incomplète"]
        )
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"assistant-{uuid.uuid4()}",
            system_message="Tu es un assistant juridique. Tu rédiges des documents à partir d'informations VALIDÉES uniquement. Tu ne dois JAMAIS inventer d'information. Chaque fait doit citer sa source (Pièce X)."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        warnings = []
        if "À confirmer" in response:
            warnings.append("Certaines informations nécessitent confirmation (marquées 'À confirmer').")
        
        return AssistantResponse(
            content=response,
            pieces_used=pieces_used,
            warnings=warnings
        )
        
    except Exception as e:
        logger.error(f"Assistant error: {e}")
        return AssistantResponse(
            content="Erreur lors de la génération du document.",
            pieces_used=pieces_used,
            warnings=[str(e)]
        )

# ===================== SHARE LINKS =====================

@api_router.post("/dossiers/{dossier_id}/share", response_model=ShareLinkResponse)
async def create_share_link(dossier_id: str, data: ShareLinkCreate, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    link_id = str(uuid.uuid4())
    token = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=data.expires_in_days)
    
    link_doc = {
        "id": link_id,
        "dossier_id": dossier_id,
        "token": token,
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat()
    }
    await db.share_links.insert_one(link_doc)
    
    return ShareLinkResponse(**link_doc)

@api_router.get("/shared/{token}")
async def get_shared_dossier(token: str):
    """Public endpoint for lawyers"""
    link = await db.share_links.find_one({"token": token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    expires = datetime.fromisoformat(link["expires_at"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=410, detail="Link expired")
    
    dossier = await db.dossiers.find_one({"id": link["dossier_id"]}, {"_id": 0})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find(
        {"dossier_id": link["dossier_id"]},
        {"_id": 0, "extracted_text": 0}
    ).sort("numero", 1).to_list(1000)
    
    # Build chronology for shared view
    chronology = []
    for p in pieces:
        if p.get("status") == "pret" and p.get("validated_data"):
            chronology.append({
                "numero": p["numero"],
                "date": p["validated_data"].get("date_document"),
                "titre": p["validated_data"].get("titre", p["original_filename"]),
                "type_piece": p["validated_data"].get("type_piece"),
                "resume": p["validated_data"]
            })
    chronology.sort(key=lambda x: x["date"] or "9999-99-99")
    
    return {
        "dossier": {
            "id": dossier["id"],
            "title": dossier["title"],
            "description": dossier["description"]
        },
        "pieces": [PieceResponse(**p) for p in pieces],
        "chronology": chronology
    }

@api_router.get("/shared/{token}/piece/{piece_id}/file")
async def get_shared_piece_file(token: str, piece_id: str):
    link = await db.share_links.find_one({"token": token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    expires = datetime.fromisoformat(link["expires_at"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=410, detail="Link expired")
    
    piece = await db.pieces.find_one({"id": piece_id, "dossier_id": link["dossier_id"]}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    filepath = UPLOAD_DIR / piece["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(filepath, filename=piece["original_filename"])

@api_router.get("/shared/{token}/export/pdf")
async def get_shared_chronology_pdf(token: str):
    """Public endpoint - Download chronology PDF"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    
    link = await db.share_links.find_one({"token": token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    expires = datetime.fromisoformat(link["expires_at"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=410, detail="Link expired")
    
    dossier = await db.dossiers.find_one({"id": link["dossier_id"]}, {"_id": 0})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": link["dossier_id"], "status": "pret"}, {"_id": 0}).to_list(1000)
    
    chronology = []
    for p in pieces:
        if p.get("validated_data"):
            chronology.append({
                "numero": p["numero"],
                "date": p["validated_data"].get("date_document"),
                "titre": p["validated_data"].get("titre", p["original_filename"]),
                "resume": p["validated_data"]
            })
    chronology.sort(key=lambda x: x["date"] or "9999-99-99")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Title_Custom', fontName='Helvetica-Bold', fontSize=16, alignment=TA_CENTER, spaceAfter=20))
    styles.add(ParagraphStyle(name='Subtitle', fontName='Helvetica', fontSize=10, alignment=TA_CENTER, textColor=colors.grey, spaceAfter=30))
    styles.add(ParagraphStyle(name='Entry_Date', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0369A1')))
    styles.add(ParagraphStyle(name='Entry_Title', fontName='Helvetica-Bold', fontSize=10, spaceAfter=5))
    styles.add(ParagraphStyle(name='Entry_Body', fontName='Helvetica', fontSize=9, alignment=TA_JUSTIFY, spaceAfter=3))
    styles.add(ParagraphStyle(name='Entry_Ref', fontName='Helvetica-Oblique', fontSize=8, textColor=colors.grey, spaceAfter=15))
    
    elements = []
    elements.append(Paragraph("CHRONOLOGIE DES FAITS", styles['Title_Custom']))
    elements.append(Paragraph(f"Dossier : {dossier['title']}", styles['Subtitle']))
    elements.append(Spacer(1, 20))
    
    for entry in chronology:
        date_str = format_date_fr(entry["date"])
        elements.append(Paragraph(f"• {date_str}", styles['Entry_Date']))
        elements.append(Paragraph(entry["titre"], styles['Entry_Title']))
        
        resume = entry["resume"]
        if resume.get("resume_qui"):
            elements.append(Paragraph(f"<b>Qui :</b> {resume['resume_qui']}", styles['Entry_Body']))
        if resume.get("resume_quoi"):
            elements.append(Paragraph(f"<b>Quoi :</b> {resume['resume_quoi']}", styles['Entry_Body']))
        if resume.get("resume_element_cle"):
            elements.append(Paragraph(f"<b>Élément clé :</b> {resume['resume_element_cle']}", styles['Entry_Body']))
        
        elements.append(Paragraph(f"Référence : Pièce {entry['numero']}", styles['Entry_Ref']))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=chronologie.pdf"}
    )

# ===================== ROOT ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Dossier Juridique Intelligent API", "version": "2.1"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "max_file_size_mb": MAX_FILE_SIZE_MB}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
