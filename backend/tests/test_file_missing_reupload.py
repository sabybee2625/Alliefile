"""
Test suite for file_missing detection and reupload functionality
Tests the new features added after GridFS migration:

1. file_missing=true detection when file is absent from GridFS
2. file_missing=false when file is present
3. Reupload endpoint - POST /api/pieces/{id}/reupload
4. Reupload restores file and returns file_missing=false
5. Health endpoint shows storage_backend=gridfs
"""
import pytest
import requests
import os
import hashlib
import io
import time
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'justice-hub-45-alliefile')

# Test user credentials
TEST_EMAIL = f"reupload_test_{int(time.time())}@test.com"
TEST_PASSWORD = "ReuploadTest123!"
TEST_NAME = "Reupload Test User"


class TestFileMissingAndReupload:
    """Test suite for file_missing detection and reupload functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Register and login to get auth token"""
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if register_response.status_code == 400:
            # User exists, try login
            login_response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            return login_response.json()["access_token"]
        
        assert register_response.status_code == 200, f"Register failed: {register_response.text}"
        return register_response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def dossier_id(self, session, auth_headers):
        """Create a test dossier"""
        response = session.post(
            f"{BASE_URL}/api/dossiers",
            json={"title": "File Missing Test Dossier", "description": "Testing file_missing and reupload"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create dossier failed: {response.text}"
        return response.json()["id"]
    
    # ==================== TEST 1: Health Endpoint ====================
    def test_01_health_shows_gridfs_backend(self, session):
        """Test that health endpoint shows storage_backend: gridfs"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert data.get("storage_backend") == "gridfs", f"Expected gridfs, got: {data.get('storage_backend')}"
        assert data.get("status") == "healthy", f"Status not healthy: {data}"
        print(f"✓ Health endpoint shows storage_backend: gridfs")
    
    # ==================== TEST 2: Upload File - file_missing=false ====================
    def test_02_upload_file_missing_false(self, session, auth_headers, dossier_id):
        """Test that uploaded file has file_missing=false in list"""
        test_content = b"Test file for file_missing detection. " * 10
        test_hash = hashlib.sha256(test_content).hexdigest()
        
        files = {"file": ("test_file_missing.txt", io.BytesIO(test_content), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        piece = response.json()
        pytest.piece_id = piece["id"]
        pytest.piece_filename = piece["filename"]
        pytest.test_content = test_content
        pytest.test_hash = test_hash
        
        # Check file_missing in list endpoint
        list_response = session.get(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        
        pieces = list_response.json()
        uploaded_piece = next((p for p in pieces if p["id"] == piece["id"]), None)
        assert uploaded_piece is not None, "Uploaded piece not found in list"
        assert uploaded_piece.get("file_missing") == False, f"Expected file_missing=false, got: {uploaded_piece.get('file_missing')}"
        
        print(f"✓ Uploaded file has file_missing=false, piece_id: {piece['id']}")
    
    # ==================== TEST 3: Get Single Piece - file_missing=false ====================
    def test_03_get_piece_file_missing_false(self, session, auth_headers):
        """Test that GET /pieces/{id} returns file_missing=false when file exists"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get piece failed: {response.text}"
        
        piece = response.json()
        assert piece.get("file_missing") == False, f"Expected file_missing=false, got: {piece.get('file_missing')}"
        
        print(f"✓ GET /pieces/{piece_id} returns file_missing=false")
    
    # ==================== TEST 4: Download File Works ====================
    def test_04_download_file_works(self, session, auth_headers):
        """Test that file download works when file exists"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.text}"
        
        downloaded_hash = hashlib.sha256(response.content).hexdigest()
        assert downloaded_hash == pytest.test_hash, f"Content hash mismatch"
        
        print(f"✓ File download works, content verified")
    
    # ==================== TEST 5: Preview File Works ====================
    def test_05_preview_file_works(self, session, auth_headers):
        """Test that file preview works when file exists"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/preview",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Preview failed: {response.text}"
        
        preview_hash = hashlib.sha256(response.content).hexdigest()
        assert preview_hash == pytest.test_hash, f"Preview content hash mismatch"
        
        print(f"✓ File preview works, content verified")
    
    # ==================== TEST 6: Delete File from GridFS Directly ====================
    def test_06_delete_file_from_gridfs_directly(self, session, auth_headers):
        """Delete file from GridFS directly to simulate missing file scenario"""
        # We need to delete the file from GridFS without deleting the piece record
        # This simulates what happens when files are lost during redeployment
        
        async def delete_from_gridfs():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            from motor.motor_asyncio import AsyncIOMotorGridFSBucket
            bucket = AsyncIOMotorGridFSBucket(db, bucket_name="file_storage")
            
            filename = pytest.piece_filename
            
            # Find and delete the file
            async for grid_file in bucket.find({"filename": filename}):
                await bucket.delete(grid_file._id)
                print(f"✓ Deleted file from GridFS: {filename}")
            
            client.close()
        
        asyncio.get_event_loop().run_until_complete(delete_from_gridfs())
        
        print(f"✓ File deleted from GridFS directly (simulating lost file)")
    
    # ==================== TEST 7: file_missing=true After Deletion ====================
    def test_07_file_missing_true_after_deletion(self, session, auth_headers, dossier_id):
        """Test that file_missing=true when file is absent from GridFS"""
        piece_id = pytest.piece_id
        
        # Check in list endpoint
        list_response = session.get(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        
        pieces = list_response.json()
        missing_piece = next((p for p in pieces if p["id"] == piece_id), None)
        assert missing_piece is not None, "Piece not found in list"
        assert missing_piece.get("file_missing") == True, f"Expected file_missing=true, got: {missing_piece.get('file_missing')}"
        
        print(f"✓ List endpoint shows file_missing=true for piece {piece_id}")
    
    # ==================== TEST 8: Get Single Piece - file_missing=true ====================
    def test_08_get_piece_file_missing_true(self, session, auth_headers):
        """Test that GET /pieces/{id} returns file_missing=true when file is absent"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get piece failed: {response.text}"
        
        piece = response.json()
        assert piece.get("file_missing") == True, f"Expected file_missing=true, got: {piece.get('file_missing')}"
        
        print(f"✓ GET /pieces/{piece_id} returns file_missing=true")
    
    # ==================== TEST 9: Download Returns 404 When Missing ====================
    def test_09_download_returns_404_when_missing(self, session, auth_headers):
        """Test that file download returns 404 when file is missing"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        
        print(f"✓ Download returns 404 when file is missing")
    
    # ==================== TEST 10: Preview Returns 404 When Missing ====================
    def test_10_preview_returns_404_when_missing(self, session, auth_headers):
        """Test that file preview returns 404 when file is missing"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/preview",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        
        print(f"✓ Preview returns 404 when file is missing")
    
    # ==================== TEST 11: Reupload Endpoint ====================
    def test_11_reupload_restores_file(self, session, auth_headers):
        """Test that POST /pieces/{id}/reupload restores the file"""
        piece_id = pytest.piece_id
        
        # Upload new content (can be different from original)
        new_content = b"This is the re-uploaded file content for testing. " * 10
        new_hash = hashlib.sha256(new_content).hexdigest()
        
        files = {"file": ("reuploaded_file.txt", io.BytesIO(new_content), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/pieces/{piece_id}/reupload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Reupload failed: {response.text}"
        
        piece = response.json()
        assert piece.get("file_missing") == False, f"Expected file_missing=false after reupload, got: {piece.get('file_missing')}"
        assert piece.get("file_size") == len(new_content), f"File size mismatch after reupload"
        
        pytest.new_content = new_content
        pytest.new_hash = new_hash
        
        print(f"✓ Reupload successful, file_missing=false, size={piece['file_size']}")
    
    # ==================== TEST 12: Download Works After Reupload ====================
    def test_12_download_works_after_reupload(self, session, auth_headers):
        """Test that file download works after reupload"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Download after reupload failed: {response.text}"
        
        downloaded_hash = hashlib.sha256(response.content).hexdigest()
        assert downloaded_hash == pytest.new_hash, f"Content hash mismatch after reupload"
        
        print(f"✓ Download works after reupload, content verified")
    
    # ==================== TEST 13: Preview Works After Reupload ====================
    def test_13_preview_works_after_reupload(self, session, auth_headers):
        """Test that file preview works after reupload"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/preview",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Preview after reupload failed: {response.text}"
        
        preview_hash = hashlib.sha256(response.content).hexdigest()
        assert preview_hash == pytest.new_hash, f"Preview content hash mismatch after reupload"
        
        print(f"✓ Preview works after reupload, content verified")
    
    # ==================== TEST 14: List Shows file_missing=false After Reupload ====================
    def test_14_list_shows_file_missing_false_after_reupload(self, session, auth_headers, dossier_id):
        """Test that list endpoint shows file_missing=false after reupload"""
        piece_id = pytest.piece_id
        
        list_response = session.get(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        
        pieces = list_response.json()
        reuploaded_piece = next((p for p in pieces if p["id"] == piece_id), None)
        assert reuploaded_piece is not None, "Piece not found in list"
        assert reuploaded_piece.get("file_missing") == False, f"Expected file_missing=false after reupload, got: {reuploaded_piece.get('file_missing')}"
        
        print(f"✓ List endpoint shows file_missing=false after reupload")
    
    # ==================== TEST 15: Reupload Non-Existent Piece Returns 404 ====================
    def test_15_reupload_nonexistent_piece_returns_404(self, session, auth_headers):
        """Test that reupload to non-existent piece returns 404"""
        fake_piece_id = "00000000-0000-0000-0000-000000000000"
        
        files = {"file": ("test.txt", io.BytesIO(b"test"), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/pieces/{fake_piece_id}/reupload",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        
        print(f"✓ Reupload to non-existent piece returns 404")
    
    # ==================== TEST 16: Delete Piece ====================
    def test_16_delete_piece(self, session, auth_headers):
        """Test that piece deletion works"""
        piece_id = pytest.piece_id
        
        response = session.delete(
            f"{BASE_URL}/api/pieces/{piece_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify piece is gone
        get_response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404, f"Piece should be deleted"
        
        print(f"✓ Piece deleted successfully")
    
    # ==================== TEST 17: Cleanup - Delete Dossier ====================
    def test_17_cleanup_delete_dossier(self, session, auth_headers, dossier_id):
        """Cleanup: Delete the test dossier"""
        response = session.delete(
            f"{BASE_URL}/api/dossiers/{dossier_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dossier deletion failed: {response.text}"
        
        print(f"✓ Test dossier cleaned up")


class TestSharedFileMissing:
    """Test file_missing behavior with shared links"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        share_email = f"share_missing_test_{int(time.time())}@test.com"
        
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": share_email,
            "password": "ShareTest123!",
            "name": "Share Test User"
        })
        
        if register_response.status_code == 200:
            return register_response.json()["access_token"]
        
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": share_email,
            "password": "ShareTest123!"
        })
        return login_response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def dossier_id(self, session, auth_headers):
        response = session.post(
            f"{BASE_URL}/api/dossiers",
            json={"title": "Shared File Missing Test"},
            headers=auth_headers
        )
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_01_upload_and_create_share(self, session, auth_headers, dossier_id):
        """Upload file and create share link"""
        content = b"Shared file content for testing"
        
        files = {"file": ("shared_test.txt", io.BytesIO(content), "text/plain")}
        
        upload_response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        
        piece = upload_response.json()
        pytest.shared_piece_id = piece["id"]
        pytest.shared_filename = piece["filename"]
        
        # Create share link
        share_response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/share",
            json={"expires_in_days": 7},
            headers=auth_headers
        )
        assert share_response.status_code == 200
        
        pytest.share_token = share_response.json()["token"]
        
        print(f"✓ File uploaded and share link created")
    
    def test_02_shared_file_access_works(self, session):
        """Test shared file access works when file exists"""
        response = session.get(
            f"{BASE_URL}/api/shared/{pytest.share_token}/piece/{pytest.shared_piece_id}/file"
        )
        
        assert response.status_code == 200, f"Shared file access failed: {response.text}"
        
        print(f"✓ Shared file access works")
    
    def test_03_delete_file_from_gridfs(self, session):
        """Delete file from GridFS to simulate missing file"""
        async def delete_from_gridfs():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            from motor.motor_asyncio import AsyncIOMotorGridFSBucket
            bucket = AsyncIOMotorGridFSBucket(db, bucket_name="file_storage")
            
            async for grid_file in bucket.find({"filename": pytest.shared_filename}):
                await bucket.delete(grid_file._id)
            
            client.close()
        
        asyncio.get_event_loop().run_until_complete(delete_from_gridfs())
        
        print(f"✓ File deleted from GridFS")
    
    def test_04_shared_file_returns_404_when_missing(self, session):
        """Test shared file access returns 404 when file is missing"""
        response = session.get(
            f"{BASE_URL}/api/shared/{pytest.share_token}/piece/{pytest.shared_piece_id}/file"
        )
        
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        
        print(f"✓ Shared file access returns 404 when file is missing")
    
    def test_05_cleanup(self, session, auth_headers, dossier_id):
        """Cleanup test dossier"""
        response = session.delete(
            f"{BASE_URL}/api/dossiers/{dossier_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        print(f"✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
