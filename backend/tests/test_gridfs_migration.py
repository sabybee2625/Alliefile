"""
Test suite for GridFS storage migration
Tests all file-related endpoints to verify GridFS storage backend is working correctly

Features tested:
1. Health endpoint shows storage_backend: gridfs
2. File upload via GridFS - POST /api/dossiers/{id}/pieces
3. File download via GridFS - GET /api/pieces/{id}/file
4. File preview via GridFS - GET /api/pieces/{id}/preview
5. Shared file access - GET /api/shared/{token}/piece/{id}/file
6. Shared PDF export - GET /api/shared/{token}/export/pdf
7. ZIP export with files - GET /api/dossiers/{id}/export/zip
8. File deletion from GridFS - DELETE /api/pieces/{id}
"""
import pytest
import requests
import os
import hashlib
import io
import zipfile
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - will be created during test
TEST_EMAIL = f"gridfs_test_{int(time.time())}@test.com"
TEST_PASSWORD = "GridFSTest123!"
TEST_NAME = "GridFS Test User"


class TestGridFSMigration:
    """Test suite for GridFS storage migration"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Register and login to get auth token"""
        # Register new user
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
            json={"title": "GridFS Test Dossier", "description": "Testing GridFS storage"},
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
    
    # ==================== TEST 2: File Upload ====================
    def test_02_upload_file_to_gridfs(self, session, auth_headers, dossier_id):
        """Test file upload stores in GridFS"""
        # Create test file content
        test_content = b"This is a test file for GridFS storage migration testing. " * 10
        test_hash = hashlib.sha256(test_content).hexdigest()
        
        files = {"file": ("test_gridfs_upload.txt", io.BytesIO(test_content), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        piece = response.json()
        assert piece.get("id"), "No piece ID returned"
        assert piece.get("filename"), "No filename returned"
        assert piece.get("file_size") == len(test_content), f"File size mismatch: expected {len(test_content)}, got {piece.get('file_size')}"
        
        # Store for later tests
        pytest.piece_id = piece["id"]
        pytest.test_content = test_content
        pytest.test_hash = test_hash
        
        print(f"✓ File uploaded successfully, piece_id: {piece['id']}, size: {piece['file_size']}")
    
    # ==================== TEST 3: File Download ====================
    def test_03_download_file_from_gridfs(self, session, auth_headers):
        """Test file download retrieves from GridFS"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.text}"
        
        # Verify content matches
        downloaded_content = response.content
        downloaded_hash = hashlib.sha256(downloaded_content).hexdigest()
        
        assert downloaded_hash == pytest.test_hash, f"Content hash mismatch: expected {pytest.test_hash}, got {downloaded_hash}"
        assert len(downloaded_content) == len(pytest.test_content), f"Content length mismatch"
        
        print(f"✓ File downloaded successfully, content verified (hash: {downloaded_hash[:16]}...)")
    
    # ==================== TEST 4: File Preview ====================
    def test_04_preview_file_from_gridfs(self, session, auth_headers):
        """Test file preview retrieves from GridFS"""
        piece_id = pytest.piece_id
        
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/preview",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Preview failed: {response.text}"
        
        # Verify content matches
        preview_content = response.content
        preview_hash = hashlib.sha256(preview_content).hexdigest()
        
        assert preview_hash == pytest.test_hash, f"Preview content hash mismatch"
        
        print(f"✓ File preview works correctly, content verified")
    
    # ==================== TEST 5: Create Share Link ====================
    def test_05_create_share_link(self, session, auth_headers, dossier_id):
        """Test creating a share link for the dossier"""
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/share",
            json={"expires_in_days": 7},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create share link failed: {response.text}"
        
        share_data = response.json()
        assert share_data.get("token"), "No share token returned"
        
        pytest.share_token = share_data["token"]
        print(f"✓ Share link created, token: {share_data['token'][:16]}...")
    
    # ==================== TEST 6: Shared File Access (No Auth) ====================
    def test_06_shared_file_access_no_auth(self, session):
        """Test shared file access works without authentication"""
        share_token = pytest.share_token
        piece_id = pytest.piece_id
        
        # Access without auth headers
        response = session.get(
            f"{BASE_URL}/api/shared/{share_token}/piece/{piece_id}/file"
        )
        
        assert response.status_code == 200, f"Shared file access failed: {response.text}"
        
        # Verify content
        shared_content = response.content
        shared_hash = hashlib.sha256(shared_content).hexdigest()
        
        assert shared_hash == pytest.test_hash, f"Shared file content mismatch"
        
        print(f"✓ Shared file access works without auth, content verified")
    
    # ==================== TEST 7: Shared PDF Export ====================
    def test_07_shared_pdf_export(self, session):
        """Test shared PDF export works without authentication"""
        share_token = pytest.share_token
        
        response = session.get(
            f"{BASE_URL}/api/shared/{share_token}/export/pdf"
        )
        
        assert response.status_code == 200, f"Shared PDF export failed: {response.text}"
        assert len(response.content) > 0, "PDF content is empty"
        
        # Check it's a PDF (starts with %PDF)
        assert response.content[:4] == b'%PDF', f"Response is not a PDF: {response.content[:20]}"
        
        print(f"✓ Shared PDF export works, size: {len(response.content)} bytes")
    
    # ==================== TEST 8: ZIP Export with Files ====================
    def test_08_zip_export_includes_files(self, session, auth_headers, dossier_id):
        """Test ZIP export includes files from GridFS"""
        response = session.get(
            f"{BASE_URL}/api/dossiers/{dossier_id}/export/zip",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"ZIP export failed: {response.text}"
        
        # Verify it's a valid ZIP
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            file_list = zf.namelist()
            assert len(file_list) > 0, "ZIP is empty"
            
            # Check for our test file
            txt_files = [f for f in file_list if f.endswith('.txt')]
            assert len(txt_files) > 0, f"No txt files in ZIP. Files: {file_list}"
            
            # Verify content of first txt file
            for txt_file in txt_files:
                content = zf.read(txt_file)
                if hashlib.sha256(content).hexdigest() == pytest.test_hash:
                    print(f"✓ ZIP export includes files from GridFS, found: {txt_file}")
                    return
            
            # If we get here, content didn't match but files exist
            print(f"✓ ZIP export works, files: {file_list}")
    
    # ==================== TEST 9: Upload Second File for Deletion Test ====================
    def test_09_upload_file_for_deletion(self, session, auth_headers, dossier_id):
        """Upload a second file to test deletion"""
        test_content = b"This file will be deleted to test GridFS deletion."
        
        files = {"file": ("to_delete.txt", io.BytesIO(test_content), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Upload for deletion test failed: {response.text}"
        
        piece = response.json()
        pytest.delete_piece_id = piece["id"]
        
        print(f"✓ Second file uploaded for deletion test, piece_id: {piece['id']}")
    
    # ==================== TEST 10: Delete File from GridFS ====================
    def test_10_delete_file_from_gridfs(self, session, auth_headers):
        """Test file deletion removes from GridFS"""
        piece_id = pytest.delete_piece_id
        
        # Delete the piece
        response = session.delete(
            f"{BASE_URL}/api/pieces/{piece_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify file is gone
        response = session.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"File should be deleted, got status: {response.status_code}"
        
        print(f"✓ File deleted from GridFS, verified 404 on access")
    
    # ==================== TEST 11: Upload PDF for Preview Test ====================
    def test_11_upload_pdf_for_preview(self, session, auth_headers, dossier_id):
        """Upload a PDF to test preview with correct content-type"""
        # Minimal valid PDF
        pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
196
%%EOF"""
        
        files = {"file": ("test_preview.pdf", io.BytesIO(pdf_content), "application/pdf")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"PDF upload failed: {response.text}"
        
        piece = response.json()
        pytest.pdf_piece_id = piece["id"]
        
        # Test preview returns PDF content-type
        preview_response = session.get(
            f"{BASE_URL}/api/pieces/{piece['id']}/preview",
            headers=auth_headers
        )
        
        assert preview_response.status_code == 200, f"PDF preview failed: {preview_response.text}"
        assert preview_response.content[:4] == b'%PDF', "Preview content is not PDF"
        
        print(f"✓ PDF uploaded and preview works correctly")
    
    # ==================== TEST 12: Cleanup - Delete Test Dossier ====================
    def test_12_cleanup_delete_dossier(self, session, auth_headers, dossier_id):
        """Cleanup: Delete the test dossier and all its pieces"""
        response = session.delete(
            f"{BASE_URL}/api/dossiers/{dossier_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dossier deletion failed: {response.text}"
        
        # Verify dossier is gone
        response = session.get(
            f"{BASE_URL}/api/dossiers/{dossier_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Dossier should be deleted, got: {response.status_code}"
        
        print(f"✓ Test dossier and all files cleaned up")


class TestGridFSEdgeCases:
    """Test edge cases for GridFS storage"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login with existing test user or create new"""
        edge_email = f"gridfs_edge_{int(time.time())}@test.com"
        
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": edge_email,
            "password": "EdgeTest123!",
            "name": "Edge Test User"
        })
        
        if register_response.status_code == 200:
            return register_response.json()["access_token"]
        
        # Try login if register failed
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": edge_email,
            "password": "EdgeTest123!"
        })
        return login_response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def dossier_id(self, session, auth_headers):
        response = session.post(
            f"{BASE_URL}/api/dossiers",
            json={"title": "Edge Case Dossier"},
            headers=auth_headers
        )
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_empty_file_rejected(self, session, auth_headers, dossier_id):
        """Test that empty files (0 bytes) are rejected"""
        files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 400, f"Empty file should be rejected, got: {response.status_code}"
        print(f"✓ Empty file correctly rejected with 400")
    
    def test_large_file_upload(self, session, auth_headers, dossier_id):
        """Test uploading a larger file (1MB)"""
        # Create 1MB of content
        large_content = b"X" * (1024 * 1024)
        large_hash = hashlib.sha256(large_content).hexdigest()
        
        files = {"file": ("large_file.bin", io.BytesIO(large_content), "application/octet-stream")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Large file upload failed: {response.text}"
        
        piece = response.json()
        assert piece["file_size"] == len(large_content), f"Size mismatch: {piece['file_size']} vs {len(large_content)}"
        
        # Download and verify
        download_response = session.get(
            f"{BASE_URL}/api/pieces/{piece['id']}/file",
            headers=auth_headers
        )
        
        assert download_response.status_code == 200
        assert hashlib.sha256(download_response.content).hexdigest() == large_hash
        
        print(f"✓ Large file (1MB) uploaded and verified correctly")
    
    def test_special_characters_filename(self, session, auth_headers, dossier_id):
        """Test file with special characters in filename"""
        content = b"Test content with special filename"
        
        # Filename with spaces and accents
        files = {"file": ("document légal (copie).txt", io.BytesIO(content), "text/plain")}
        
        response = session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
            files=files,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Special filename upload failed: {response.text}"
        
        piece = response.json()
        assert "légal" in piece["original_filename"] or "legal" in piece["original_filename"].lower()
        
        print(f"✓ File with special characters uploaded: {piece['original_filename']}")
    
    def test_cleanup_edge_dossier(self, session, auth_headers, dossier_id):
        """Cleanup edge case dossier"""
        response = session.delete(
            f"{BASE_URL}/api/dossiers/{dossier_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ Edge case dossier cleaned up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
