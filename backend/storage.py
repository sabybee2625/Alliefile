"""
Storage abstraction layer for file management
Supports local filesystem and S3-compatible storage (AWS S3, Cloudflare R2, MinIO)
"""
import os
import aiofiles
from pathlib import Path
from typing import Optional, BinaryIO, AsyncGenerator
from abc import ABC, abstractmethod
import hashlib
import logging
import io
from motor.motor_asyncio import AsyncIOMotorClient
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

logger = logging.getLogger(__name__)


class StorageBackend(ABC):
    """Abstract base class for storage backends"""
    
    @abstractmethod
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        """Save file and return storage path/key"""
        pass
    
    @abstractmethod
    async def get_file(self, path: str) -> bytes:
        """Get file content"""
        pass
    
    @abstractmethod
    async def delete_file(self, path: str) -> bool:
        """Delete file, return True if successful"""
        pass
    
    @abstractmethod
    async def file_exists(self, path: str) -> bool:
        """Check if file exists"""
        pass
    
    @abstractmethod
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        """Get file as async stream for large files"""
        pass
    
    @abstractmethod
    def get_file_size(self, path: str) -> int:
        """Get file size in bytes"""
        pass


class LocalStorage(StorageBackend):
    """Local filesystem storage"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def _get_full_path(self, path: str) -> Path:
        """Get full filesystem path"""
        return self.base_path / path
    
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        """Save file to local filesystem"""
        if folder:
            folder_path = self.base_path / folder
            folder_path.mkdir(parents=True, exist_ok=True)
            storage_path = f"{folder}/{filename}"
        else:
            storage_path = filename
        
        full_path = self._get_full_path(storage_path)
        
        async with aiofiles.open(full_path, 'wb') as f:
            await f.write(content)
        
        logger.debug(f"Saved file to local storage: {storage_path}")
        return storage_path
    
    async def get_file(self, path: str) -> bytes:
        """Get file from local filesystem"""
        full_path = self._get_full_path(path)
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        async with aiofiles.open(full_path, 'rb') as f:
            return await f.read()
    
    async def delete_file(self, path: str) -> bool:
        """Delete file from local filesystem"""
        full_path = self._get_full_path(path)
        
        try:
            if full_path.exists():
                full_path.unlink()
                logger.debug(f"Deleted file from local storage: {path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file {path}: {e}")
            return False
    
    async def file_exists(self, path: str) -> bool:
        """Check if file exists in local filesystem"""
        return self._get_full_path(path).exists()
    
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        """Stream file from local filesystem"""
        full_path = self._get_full_path(path)
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        async with aiofiles.open(full_path, 'rb') as f:
            while chunk := await f.read(65536):  # 64KB chunks
                yield chunk
    
    def get_file_size(self, path: str) -> int:
        """Get file size from local filesystem"""
        full_path = self._get_full_path(path)
        return full_path.stat().st_size if full_path.exists() else 0


class GridFSStorage(StorageBackend):
    """MongoDB GridFS storage backend"""
    
    def __init__(self, mongo_url: str, db_name: str):
        # Use provided MONGO_URL for GridFS persistence
        self.mongo_url = mongo_url
        self.db_name = db_name
        self._client = None
        self._db = None
        self._bucket = None
        
    async def _get_bucket(self):
        if self._bucket is None:
            self._client = AsyncIOMotorClient(self.mongo_url)
            self._db = self._client[self.db_name]
            self._bucket = AsyncIOMotorGridFSBucket(self._db, bucket_name="file_storage")
        return self._bucket
        
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        bucket = await self._get_bucket()
        # GridFS uses filename as the identifier, or we can use the returned ID
        # For compatibility with the current app, we'll use the filename
        grid_in = await bucket.open_upload_stream(filename)
        await grid_in.write(content)
        await grid_in.close()
        return filename
        
    async def get_file(self, path: str) -> bytes:
        bucket = await self._get_bucket()
        output = io.BytesIO()
        try:
            await bucket.download_to_stream_by_name(path, output)
            return output.getvalue()
        except Exception as e:
            logger.error(f"GridFS error getting file {path}: {e}")
            raise FileNotFoundError(f"File not found in GridFS: {path}")
            
    async def delete_file(self, path: str) -> bool:
        bucket = await self._get_bucket()
        try:
            # Need to find the file ID first
            cursor = bucket.find({"filename": path})
            async for grid_out in cursor:
                await bucket.delete(grid_out._id)
            return True
        except Exception as e:
            logger.error(f"Error deleting from GridFS {path}: {e}")
            return False
            
    async def file_exists(self, path: str) -> bool:
        bucket = await self._get_bucket()
        cursor = bucket.find({"filename": path})
        async for _ in cursor:
            return True
        return False
        
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        bucket = await self._get_bucket()
        grid_out = await bucket.open_download_stream_by_name(path)
        while chunk := await grid_out.read(65536):
            yield chunk
            
    def get_file_size(self, path: str) -> int:
        # This would need to be async to query GridFS
        return 0


class S3Storage(StorageBackend):
    """
    S3-compatible storage (AWS S3, Cloudflare R2, MinIO)
    Requires: pip install aioboto3
    """
    
    def __init__(
        self,
        bucket: str,
        access_key: str,
        secret_key: str,
        region: str = "eu-west-1",
        endpoint_url: Optional[str] = None  # For R2/MinIO
    ):
        self.bucket = bucket
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region
        self.endpoint_url = endpoint_url
        self._client = None
    
    async def _get_client(self):
        """Get or create S3 client"""
        if self._client is None:
            try:
                import aioboto3
                session = aioboto3.Session()
                self._client = await session.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    endpoint_url=self.endpoint_url
                ).__aenter__()
            except ImportError:
                raise RuntimeError(
                    "S3 storage requires aioboto3. Install with: pip install aioboto3"
                )
        return self._client
    
    async def save_file(self, content: bytes, filename: str, folder: str = "") -> str:
        """Save file to S3"""
        client = await self._get_client()
        
        key = f"{folder}/{filename}" if folder else filename
        
        await client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content
        )
        
        logger.debug(f"Saved file to S3: {key}")
        return key
    
    async def get_file(self, path: str) -> bytes:
        """Get file from S3"""
        client = await self._get_client()
        
        response = await client.get_object(Bucket=self.bucket, Key=path)
        return await response['Body'].read()
    
    async def delete_file(self, path: str) -> bool:
        """Delete file from S3"""
        try:
            client = await self._get_client()
            await client.delete_object(Bucket=self.bucket, Key=path)
            logger.debug(f"Deleted file from S3: {path}")
            return True
        except Exception as e:
            logger.error(f"Error deleting file {path}: {e}")
            return False
    
    async def file_exists(self, path: str) -> bool:
        """Check if file exists in S3"""
        try:
            client = await self._get_client()
            await client.head_object(Bucket=self.bucket, Key=path)
            return True
        except:
            return False
    
    async def get_file_stream(self, path: str) -> AsyncGenerator[bytes, None]:
        """Stream file from S3"""
        client = await self._get_client()
        response = await client.get_object(Bucket=self.bucket, Key=path)
        
        async for chunk in response['Body'].iter_chunks(chunk_size=65536):
            yield chunk
    
    def get_file_size(self, path: str) -> int:
        """Get file size from S3 - sync version for compatibility"""
        # This would need to be async in practice
        return 0


def get_storage_backend() -> StorageBackend:
    """Factory function to get the configured storage backend"""
    from config import config
    
    if config.STORAGE_BACKEND.value == "s3" and config.is_s3_configured:
        return S3Storage(
            bucket=config.S3_BUCKET,
            access_key=config.S3_ACCESS_KEY,
            secret_key=config.S3_SECRET_KEY,
            region=config.S3_REGION,
            endpoint_url=config.S3_ENDPOINT_URL
        )
    elif config.STORAGE_BACKEND.value == "r2" and config.is_s3_configured:
        # Cloudflare R2 uses S3-compatible API
        return S3Storage(
            bucket=config.S3_BUCKET,
            access_key=config.S3_ACCESS_KEY,
            secret_key=config.S3_SECRET_KEY,
            region="auto",
            endpoint_url=config.S3_ENDPOINT_URL
        )
    elif config.STORAGE_BACKEND.value == "gridfs":
        return GridFSStorage(
            mongo_url=config.MONGO_URL,
            db_name=config.DB_NAME
        )
    else:
        # Default to local storage
        return LocalStorage(config.UPLOAD_DIR)


# Helper function to compute file hash
def compute_file_hash(content: bytes) -> str:
    """Compute SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()
