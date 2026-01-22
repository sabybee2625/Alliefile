from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import FileResponse, StreamingResponse
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

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    type_confidence: str  # faible, moyen, fort
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
    status: str  # a_verifier, pret
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
    
    # Delete pieces and files
    pieces = await db.pieces.find({"dossier_id": dossier_id}).to_list(1000)
    for piece in pieces:
        filepath = UPLOAD_DIR / piece["filename"]
        if filepath.exists():
            filepath.unlink()
    
    await db.pieces.delete_many({"dossier_id": dossier_id})
    await db.share_links.delete_many({"dossier_id": dossier_id})
    await db.dossiers.delete_one({"id": dossier_id})
    return {"message": "Dossier deleted"}

# ===================== PIECE ROUTES =====================

@api_router.post("/dossiers/{dossier_id}/pieces", response_model=PieceResponse)
async def upload_piece(dossier_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    # Verify dossier ownership
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    # Get next piece number
    last_piece = await db.pieces.find_one({"dossier_id": dossier_id}, sort=[("numero", -1)])
    next_numero = (last_piece["numero"] + 1) if last_piece else 1
    
    # Determine file type
    ext = Path(file.filename).suffix.lower()
    file_type_map = {".pdf": "pdf", ".jpg": "image", ".jpeg": "image", ".png": "image", ".docx": "docx"}
    file_type = file_type_map.get(ext, "other")
    
    # Save file
    piece_id = str(uuid.uuid4())
    filename = f"{piece_id}{ext}"
    filepath = UPLOAD_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    now = datetime.now(timezone.utc).isoformat()
    piece_doc = {
        "id": piece_id,
        "dossier_id": dossier_id,
        "numero": next_numero,
        "filename": filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "status": "a_verifier",
        "ai_proposal": None,
        "validated_data": None,
        "created_at": now,
        "updated_at": now
    }
    await db.pieces.insert_one(piece_doc)
    
    return PieceResponse(**piece_doc)

@api_router.get("/dossiers/{dossier_id}/pieces", response_model=List[PieceResponse])
async def list_pieces(dossier_id: str, user: dict = Depends(get_current_user)):
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id}, {"_id": 0}).sort("numero", 1).to_list(1000)
    return [PieceResponse(**p) for p in pieces]

@api_router.get("/pieces/{piece_id}", response_model=PieceResponse)
async def get_piece(piece_id: str, user: dict = Depends(get_current_user)):
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    # Verify ownership
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return PieceResponse(**piece)

@api_router.get("/pieces/{piece_id}/file")
async def get_piece_file(piece_id: str, user: dict = Depends(get_current_user)):
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    filepath = UPLOAD_DIR / piece["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(filepath, filename=piece["original_filename"])

@api_router.post("/pieces/{piece_id}/analyze", response_model=PieceResponse)
async def analyze_piece(piece_id: str, user: dict = Depends(get_current_user)):
    """Trigger AI analysis of a piece"""
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Perform AI analysis
    filepath = UPLOAD_DIR / piece["filename"]
    ai_proposal = await analyze_document_with_ai(filepath, piece["file_type"], piece["original_filename"])
    
    # Update piece
    await db.pieces.update_one(
        {"id": piece_id},
        {"$set": {"ai_proposal": ai_proposal, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    return PieceResponse(**piece)

@api_router.post("/pieces/{piece_id}/validate", response_model=PieceResponse)
async def validate_piece(piece_id: str, data: PieceValidation, user: dict = Depends(get_current_user)):
    """User validates AI proposal or provides their own data"""
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
    
    piece = await db.pieces.find_one({"id": piece_id}, {"_id": 0})
    return PieceResponse(**piece)

@api_router.delete("/pieces/{piece_id}")
async def delete_piece(piece_id: str, user: dict = Depends(get_current_user)):
    piece = await db.pieces.find_one({"id": piece_id})
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    
    dossier = await db.dossiers.find_one({"id": piece["dossier_id"], "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete file
    filepath = UPLOAD_DIR / piece["filename"]
    if filepath.exists():
        filepath.unlink()
    
    await db.pieces.delete_one({"id": piece_id})
    return {"message": "Piece deleted"}

@api_router.post("/dossiers/{dossier_id}/renumber")
async def renumber_pieces(dossier_id: str, user: dict = Depends(get_current_user)):
    """Renumber pieces in order"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find({"dossier_id": dossier_id}).sort("numero", 1).to_list(1000)
    for i, piece in enumerate(pieces, 1):
        await db.pieces.update_one({"id": piece["id"]}, {"$set": {"numero": i}})
    
    return {"message": "Pieces renumbered"}

# ===================== AI ANALYSIS =====================

async def analyze_document_with_ai(filepath: Path, file_type: str, original_filename: str) -> dict:
    """Analyze document using GPT-5.2 Vision"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.error("EMERGENT_LLM_KEY not set")
        return generate_fallback_proposal(original_filename)
    
    try:
        system_message = """Tu es un assistant juridique expert. Analyse ce document juridique et extrais les informations suivantes de manière structurée.

IMPORTANT:
- N'invente JAMAIS d'information. Si tu ne trouves pas une information, indique "Non identifié".
- Pour chaque information, indique un niveau de confiance: "faible", "moyen", ou "fort".
- Cite un extrait du document qui justifie ta proposition quand c'est possible.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "type_piece": "plainte|main_courante|certificat_medical|attestation|sms|conclusions|assignation|recit|autre",
  "type_confidence": "faible|moyen|fort",
  "date_document": "YYYY-MM-DD ou null si non trouvée",
  "date_confidence": "faible|moyen|fort",
  "titre": "titre clair et standardisé",
  "titre_confidence": "faible|moyen|fort",
  "resume_qui": "personnes impliquées",
  "resume_quoi": "fait ou motif principal",
  "resume_ou": "lieu si mentionné ou null",
  "resume_element_cle": "diagnostic, menace, refus, constat, etc.",
  "mots_cles": ["mot1", "mot2", "mot3"],
  "extrait_justificatif": "extrait du document justifiant l'analyse"
}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"analysis-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Determine mime type
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
        
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return generate_fallback_proposal(original_filename)

def generate_fallback_proposal(filename: str) -> dict:
    """Generate basic proposal when AI fails"""
    return {
        "type_piece": "autre",
        "type_confidence": "faible",
        "date_document": None,
        "date_confidence": "faible",
        "titre": Path(filename).stem.replace("_", " ").replace("-", " ").title(),
        "titre_confidence": "faible",
        "resume_qui": None,
        "resume_quoi": None,
        "resume_ou": None,
        "resume_element_cle": None,
        "mots_cles": [],
        "extrait_justificatif": "Analyse automatique non disponible. Veuillez remplir manuellement."
    }

# ===================== EXPORTS =====================

@api_router.get("/dossiers/{dossier_id}/chronology")
async def get_chronology(dossier_id: str, user: dict = Depends(get_current_user)):
    """Get chronological view of validated pieces"""
    dossier = await db.dossiers.find_one({"id": dossier_id, "user_id": user["id"]})
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier not found")
    
    pieces = await db.pieces.find(
        {"dossier_id": dossier_id, "status": "pret"},
        {"_id": 0}
    ).to_list(1000)
    
    # Build chronology entries
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
    
    # Sort by date
    chronology.sort(key=lambda x: x["date"] or "9999-99-99")
    
    return {"dossier": dossier["title"], "entries": chronology}

@api_router.get("/dossiers/{dossier_id}/export/csv")
async def export_csv(dossier_id: str, user: dict = Depends(get_current_user)):
    """Export sommaire as CSV"""
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
    """Export all pieces as ZIP"""
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
    """Public endpoint for lawyers to view shared dossier"""
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
        {"_id": 0}
    ).sort("numero", 1).to_list(1000)
    
    return {
        "dossier": {
            "title": dossier["title"],
            "description": dossier["description"]
        },
        "pieces": [PieceResponse(**p) for p in pieces]
    }

@api_router.get("/shared/{token}/piece/{piece_id}/file")
async def get_shared_piece_file(token: str, piece_id: str):
    """Public endpoint for lawyers to download shared piece file"""
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

# ===================== ROOT ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Dossier Juridique Intelligent API"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

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
