"""
Migration script: Upload existing local files to MongoDB GridFS
Run this once to migrate from local storage to GridFS.
"""
import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
import certifi
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "legal_dossier_db")
UPLOAD_DIR = ROOT_DIR / "uploads"


async def migrate():
    if not MONGO_URL:
        logger.error("MONGO_URL not set")
        return
    
    if MONGO_URL.startswith("mongodb+srv"):
        client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    else:
        client = AsyncIOMotorClient(MONGO_URL)
    
    db = client[DB_NAME]
    bucket = AsyncIOMotorGridFSBucket(db, bucket_name="file_storage")
    
    if not UPLOAD_DIR.exists():
        logger.info("No uploads directory found, nothing to migrate.")
        return
    
    # Get all pieces from DB to know which files are actually referenced
    pieces = await db.pieces.find({}, {"filename": 1, "_id": 0}).to_list(100000)
    referenced_files = {p["filename"] for p in pieces}
    
    local_files = list(UPLOAD_DIR.iterdir())
    logger.info(f"Found {len(local_files)} local files, {len(referenced_files)} referenced in DB")
    
    migrated = 0
    skipped = 0
    errors = 0
    already_exists = 0
    
    for filepath in local_files:
        if filepath.is_dir():
            continue
        
        filename = filepath.name
        
        # Check if file is referenced in DB
        if filename not in referenced_files:
            skipped += 1
            continue
        
        # Check if already in GridFS
        existing = await bucket.find({"filename": filename}).to_list(1)
        if existing:
            already_exists += 1
            continue
        
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            await bucket.upload_from_stream(filename, content)
            migrated += 1
            
            if migrated % 10 == 0:
                logger.info(f"Migrated {migrated} files...")
                
        except Exception as e:
            logger.error(f"Error migrating {filename}: {e}")
            errors += 1
    
    logger.info(f"Migration complete: {migrated} migrated, {already_exists} already existed, {skipped} unreferenced, {errors} errors")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
