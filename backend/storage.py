"""
Storage abstraction layer for file management
Supports local filesystem, S3-compatible storage, MongoDB GridFS, and Emergent Object Storage
"""
import os
import io
import aiofiles
import requests
from pathlib import Path
from typing import Optional, AsyncGenerator
from abc import ABC, abstractmethod
import hashlib
import logging
import tempfile

logger = logging.getLogger(__name__)

APP_NAME = "justice-hub-45"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"


class StorageBackend(ABC):
    """Abstract base class for storage backends"""
    
    @abstractmethod
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        pass
    
    @abstractmethod
    async def get_file(self, path: str) -> bytes:
        pass
    
    @abstractmethod
    async def delete_file(self, path: str) -> bool:
        pass
    
    @abstractmethod
    async def file_exists(self, path: str) -> bool:
        pass
    
    @abstractmethod
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        pass
    
    @abstractmethod
    def get_file_size(self, path: str) -> int:
        pass

    async def get_temp_filepath(self, filename: str) -> Path:
        """Download file to a temporary location and return the path."""
        content = await self.get_file(filename)
        ext = Path(filename).suffix
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp.write(content)
        tmp.close()
        return Path(tmp.name)


class EmergentObjectStorage(StorageBackend):
    """Emergent Object Storage - persistent cloud storage that survives redeployments"""
    
    def __init__(self):
        self._storage_key = None
        self._emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not self._emergent_key:
            raise RuntimeError("EMERGENT_LLM_KEY not set - required for object storage")
        self._init_storage()
    
    def _init_storage(self):
        """Initialize storage session - call once at startup"""
        if self._storage_key:
            return
        try:
            resp = requests.post(
                f"{STORAGE_URL}/init",
                json={"emergent_key": self._emergent_key},
                timeout=30
            )
            resp.raise_for_status()
            self._storage_key = resp.json()["storage_key"]
            logger.info("Emergent Object Storage initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Emergent Object Storage: {e}")
            raise
    
    def _ensure_key(self):
        if not self._storage_key:
            self._init_storage()
    
    def _get_path(self, filename: str) -> str:
        """Get storage path for a filename"""
        return f"{APP_NAME}/uploads/{filename}"
    
    def _get_content_type(self, filename: str) -> str:
        """Determine content type from extension"""
        ext = Path(filename).suffix.lower()
        types = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
            ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf",
            ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt": "text/plain", ".csv": "text/csv",
        }
        return types.get(ext, "application/octet-stream")
    
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        """Upload file to Emergent Object Storage"""
        self._ensure_key()
        path = self._get_path(filename)
        content_type = self._get_content_type(filename)
        
        try:
            resp = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": self._storage_key, "Content-Type": content_type},
                data=content,
                timeout=120
            )
            resp.raise_for_status()
            result = resp.json()
            logger.debug(f"Saved to Emergent Object Storage: {result.get('path', path)}")
            return filename
        except Exception as e:
            logger.error(f"Failed to upload {filename} to Object Storage: {e}")
            raise
    
    async def get_file(self, path: str) -> bytes:
        """Download file from Emergent Object Storage"""
        self._ensure_key()
        storage_path = self._get_path(path)
        
        try:
            resp = requests.get(
                f"{STORAGE_URL}/objects/{storage_path}",
                headers={"X-Storage-Key": self._storage_key},
                timeout=60
            )
            resp.raise_for_status()
            return resp.content
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                raise FileNotFoundError(f"File not found: {path}")
            raise
        except Exception as e:
            raise FileNotFoundError(f"Error fetching {path}: {e}")
    
    async def delete_file(self, path: str) -> bool:
        """Soft-delete (Object Storage has no delete API)"""
        logger.debug(f"Soft-delete noted for: {path}")
        return True
    
    async def file_exists(self, path: str) -> bool:
        """Check if file exists by attempting to get it"""
        self._ensure_key()
        storage_path = self._get_path(path)
        
        try:
            resp = requests.get(
                f"{STORAGE_URL}/objects/{storage_path}",
                headers={"X-Storage-Key": self._storage_key},
                timeout=10,
                stream=True
            )
            resp.close()
            return resp.status_code == 200
        except Exception:
            return False
    
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        """Stream file from Object Storage"""
        content = await self.get_file(path)
        chunk_size = 65536
        for i in range(0, len(content), chunk_size):
            yield content[i:i + chunk_size]
    
    def get_file_size(self, path: str) -> int:
        return 0


class LocalStorage(StorageBackend):
    """Local filesystem storage"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _get_full_path(self, path: str) -> Path:
        return self.base_path / path
    
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        if folder:
            folder_path = self.base_path / folder
            folder_path.mkdir(parents=True, exist_ok=True)
            storage_path = f"{folder}/{filename}"
        else:
            storage_path = filename
        
        full_path = self._get_full_path(storage_path)
        async with aiofiles.open(full_path, 'wb') as f:
            await f.write(content)
        return storage_path
    
    async def get_file(self, path: str) -> bytes:
        full_path = self._get_full_path(path)
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        async with aiofiles.open(full_path, 'rb') as f:
            return await f.read()
    
    async def delete_file(self, path: str) -> bool:
        full_path = self._get_full_path(path)
        try:
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {path}: {e}")
            return False
    
    async def file_exists(self, path: str) -> bool:
        return self._get_full_path(path).exists()
    
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        full_path = self._get_full_path(path)
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        async with aiofiles.open(full_path, 'rb') as f:
            while chunk := await f.read(65536):
                yield chunk
    
    def get_file_size(self, path: str) -> int:
        full_path = self._get_full_path(path)
        return full_path.stat().st_size if full_path.exists() else 0

    async def get_temp_filepath(self, filename: str) -> Path:
        full_path = self._get_full_path(filename)
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {filename}")
        return full_path


class GridFSStorage(StorageBackend):
    """MongoDB GridFS storage"""
    
    def __init__(self, db):
        import motor.motor_asyncio
        self._db = db
        self._bucket = motor.motor_asyncio.AsyncIOMotorGridFSBucket(db, bucket_name="file_storage")
    
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        key = f"{folder}/{filename}" if folder else filename
        try:
            async for grid_file in self._bucket.find({"filename": key}):
                await self._bucket.delete(grid_file._id)
        except Exception:
            pass
        await self._bucket.upload_from_stream(key, content)
        return key
    
    async def get_file(self, path: str) -> bytes:
        try:
            stream = await self._bucket.open_download_stream_by_name(path)
            return await stream.read()
        except Exception:
            raise FileNotFoundError(f"File not found in GridFS: {path}")
    
    async def delete_file(self, path: str) -> bool:
        try:
            deleted = False
            async for grid_file in self._bucket.find({"filename": path}):
                await self._bucket.delete(grid_file._id)
                deleted = True
            return deleted
        except Exception as e:
            logger.error(f"Error deleting from GridFS {path}: {e}")
            return False
    
    async def file_exists(self, path: str) -> bool:
        try:
            async for _ in self._bucket.find({"filename": path}):
                return True
            return False
        except Exception:
            return False
    
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        try:
            stream = await self._bucket.open_download_stream_by_name(path)
            while chunk := await stream.readchunk():
                if not chunk:
                    break
                yield chunk
        except Exception:
            raise FileNotFoundError(f"File not found in GridFS: {path}")
    
    def get_file_size(self, path: str) -> int:
        return 0


def get_storage_backend(db_instance=None):
    """Factory function to get the configured storage backend"""
    from config import config
    
    backend_type = config.STORAGE_BACKEND.value
    
    if backend_type == "emergent":
        return EmergentObjectStorage()
    elif backend_type == "gridfs":
        if db_instance is None:
            raise RuntimeError("GridFS storage requires a database instance")
        return GridFSStorage(db_instance)
    else:
        return LocalStorage(config.UPLOAD_DIR)


def compute_file_hash(content: bytes) -> str:
    """Compute SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()
