"""
Phase 4 Feature Tests - Testing P0, P1, P2 bug fixes
- P0: Authenticated file download and preview
- P1: Duplicate detection, analysis queue, batch delete
- P2: Date input improvements (tested via frontend)
"""
import pytest
import requests
import os
import tempfile
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smartdocs-103.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test_phase4@test.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Test Phase4 User"


class TestAuthSetup:
    """Setup: Register/Login test user"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_register_or_login(self, session):
        """Register new user or login if exists"""
        # Try to register
        register_res = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        })
        
        if register_res.status_code == 200:
            data = register_res.json()
            assert "access_token" in data
            session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
            print(f"Registered new user: {TEST_EMAIL}")
        elif register_res.status_code == 400:
            # User exists, login instead
            login_res = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert login_res.status_code == 200, f"Login failed: {login_res.text}"
            data = login_res.json()
            assert "access_token" in data
            session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
            print(f"Logged in existing user: {TEST_EMAIL}")
        else:
            pytest.fail(f"Registration failed: {register_res.text}")


class TestP0FileDownloadAuth:
    """P0: Test authenticated file download and preview endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code != 200:
            # Register first
            reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            assert reg_res.status_code == 200
            data = reg_res.json()
        else:
            data = login_res.json()
        
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        return session
    
    @pytest.fixture(scope="class")
    def test_dossier_and_piece(self, auth_session):
        """Create a test dossier and upload a piece"""
        # Create dossier
        dossier_res = auth_session.post(f"{BASE_URL}/api/dossiers", json={
            "title": "TEST_P0_Dossier",
            "description": "Test dossier for P0 file download tests"
        })
        assert dossier_res.status_code == 200
        dossier = dossier_res.json()
        dossier_id = dossier["id"]
        
        # Upload a test file
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(b"Test content for P0 file download test")
            f.flush()
            
            with open(f.name, 'rb') as file:
                files = {'file': ('test_p0.txt', file, 'text/plain')}
                upload_res = auth_session.post(
                    f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                    files=files
                )
        
        assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
        piece = upload_res.json()
        
        yield {"dossier_id": dossier_id, "piece_id": piece["id"], "piece": piece}
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/dossiers/{dossier_id}")
    
    def test_file_download_with_auth(self, auth_session, test_dossier_and_piece):
        """P0: File download should return 200 with valid token"""
        piece_id = test_dossier_and_piece["piece_id"]
        
        res = auth_session.get(f"{BASE_URL}/api/pieces/{piece_id}/file")
        assert res.status_code == 200, f"File download failed: {res.status_code}"
        assert len(res.content) > 0, "File content is empty"
        print(f"✓ File download with auth: 200 OK, {len(res.content)} bytes")
    
    def test_file_download_without_auth(self, test_dossier_and_piece):
        """P0: File download should return 401/403 without token"""
        piece_id = test_dossier_and_piece["piece_id"]
        
        # Request without auth header
        res = requests.get(f"{BASE_URL}/api/pieces/{piece_id}/file")
        assert res.status_code in [401, 403], f"Expected 401/403, got {res.status_code}"
        print(f"✓ File download without auth: {res.status_code} (correctly denied)")
    
    def test_preview_with_auth(self, auth_session, test_dossier_and_piece):
        """P0: Preview should return 200 with valid token"""
        piece_id = test_dossier_and_piece["piece_id"]
        
        res = auth_session.get(f"{BASE_URL}/api/pieces/{piece_id}/preview")
        assert res.status_code == 200, f"Preview failed: {res.status_code}"
        print(f"✓ Preview with auth: 200 OK")
    
    def test_preview_without_auth(self, test_dossier_and_piece):
        """P0: Preview should return 401/403 without token"""
        piece_id = test_dossier_and_piece["piece_id"]
        
        res = requests.get(f"{BASE_URL}/api/pieces/{piece_id}/preview")
        assert res.status_code in [401, 403], f"Expected 401/403, got {res.status_code}"
        print(f"✓ Preview without auth: {res.status_code} (correctly denied)")


class TestP1DuplicateDetection:
    """P1: Test duplicate file detection"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code != 200:
            reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            data = reg_res.json()
        else:
            data = login_res.json()
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        return session
    
    @pytest.fixture(scope="class")
    def test_dossier(self, auth_session):
        dossier_res = auth_session.post(f"{BASE_URL}/api/dossiers", json={
            "title": "TEST_P1_Duplicate_Dossier",
            "description": "Test dossier for duplicate detection"
        })
        assert dossier_res.status_code == 200
        dossier = dossier_res.json()
        yield dossier
        auth_session.delete(f"{BASE_URL}/api/dossiers/{dossier['id']}")
    
    def test_duplicate_detection_returns_409(self, auth_session, test_dossier):
        """P1: Uploading same file twice should return 409"""
        dossier_id = test_dossier["id"]
        
        # Create unique test content
        unique_content = f"Duplicate test content {time.time()}".encode()
        
        # First upload - should succeed
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(unique_content)
            f.flush()
            
            with open(f.name, 'rb') as file:
                files = {'file': ('duplicate_test.txt', file, 'text/plain')}
                first_res = auth_session.post(
                    f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                    files=files
                )
        
        assert first_res.status_code == 200, f"First upload failed: {first_res.text}"
        print(f"✓ First upload: 200 OK")
        
        # Second upload with same content - should return 409
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(unique_content)
            f.flush()
            
            with open(f.name, 'rb') as file:
                files = {'file': ('duplicate_test2.txt', file, 'text/plain')}
                second_res = auth_session.post(
                    f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                    files=files
                )
        
        assert second_res.status_code == 409, f"Expected 409 for duplicate, got {second_res.status_code}"
        print(f"✓ Duplicate upload: 409 Conflict (correctly detected)")
    
    def test_force_upload_duplicate(self, auth_session, test_dossier):
        """P1: force_upload=true should allow duplicate with is_duplicate=true"""
        dossier_id = test_dossier["id"]
        
        # Create unique test content
        unique_content = f"Force upload test {time.time()}".encode()
        
        # First upload
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(unique_content)
            f.flush()
            
            with open(f.name, 'rb') as file:
                files = {'file': ('force_test.txt', file, 'text/plain')}
                first_res = auth_session.post(
                    f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                    files=files
                )
        
        assert first_res.status_code == 200
        
        # Second upload with force_upload=true
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(unique_content)
            f.flush()
            
            with open(f.name, 'rb') as file:
                files = {'file': ('force_test2.txt', file, 'text/plain')}
                force_res = auth_session.post(
                    f"{BASE_URL}/api/dossiers/{dossier_id}/pieces?force_upload=true",
                    files=files
                )
        
        assert force_res.status_code == 200, f"Force upload failed: {force_res.text}"
        data = force_res.json()
        assert data.get("is_duplicate") == True, "is_duplicate should be True"
        print(f"✓ Force upload duplicate: 200 OK with is_duplicate=True")


class TestP1AnalysisQueue:
    """P1: Test analysis queue functionality"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code != 200:
            reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            data = reg_res.json()
        else:
            data = login_res.json()
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        return session
    
    @pytest.fixture(scope="class")
    def test_dossier_with_pieces(self, auth_session):
        """Create dossier with multiple pieces for queue testing"""
        dossier_res = auth_session.post(f"{BASE_URL}/api/dossiers", json={
            "title": "TEST_P1_Queue_Dossier",
            "description": "Test dossier for queue testing"
        })
        assert dossier_res.status_code == 200
        dossier = dossier_res.json()
        dossier_id = dossier["id"]
        
        # Upload 2 test pieces
        piece_ids = []
        for i in range(2):
            content = f"Queue test piece {i} - {time.time()}".encode()
            with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
                f.write(content)
                f.flush()
                
                with open(f.name, 'rb') as file:
                    files = {'file': (f'queue_test_{i}.txt', file, 'text/plain')}
                    upload_res = auth_session.post(
                        f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                        files=files
                    )
            
            assert upload_res.status_code == 200
            piece_ids.append(upload_res.json()["id"])
        
        yield {"dossier_id": dossier_id, "piece_ids": piece_ids}
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/dossiers/{dossier_id}")
    
    def test_queue_analysis_endpoint(self, auth_session, test_dossier_with_pieces):
        """P1: queue-analysis should set pieces to 'queued' status"""
        dossier_id = test_dossier_with_pieces["dossier_id"]
        
        res = auth_session.post(f"{BASE_URL}/api/dossiers/{dossier_id}/queue-analysis", json={
            "piece_ids": []  # Empty = all pending
        })
        
        assert res.status_code == 200, f"Queue analysis failed: {res.text}"
        data = res.json()
        assert "queued_count" in data
        print(f"✓ Queue analysis: {data['queued_count']} pieces queued")
    
    def test_queue_status_endpoint(self, auth_session, test_dossier_with_pieces):
        """P1: queue-status should return counters"""
        dossier_id = test_dossier_with_pieces["dossier_id"]
        
        res = auth_session.get(f"{BASE_URL}/api/dossiers/{dossier_id}/queue-status")
        
        assert res.status_code == 200, f"Queue status failed: {res.text}"
        data = res.json()
        
        # Verify all expected fields
        expected_fields = ["pending", "queued", "analyzing", "complete", "error", "total"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Queue status: pending={data['pending']}, queued={data['queued']}, complete={data['complete']}, error={data['error']}")


class TestP1BatchDelete:
    """P1: Test batch delete functionality"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code != 200:
            reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            data = reg_res.json()
        else:
            data = login_res.json()
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        return session
    
    def test_delete_many_pieces(self, auth_session):
        """P1: delete-many should delete multiple pieces at once"""
        # Create a fresh dossier
        dossier_res = auth_session.post(f"{BASE_URL}/api/dossiers", json={
            "title": "TEST_P1_BatchDelete_Dossier",
            "description": "Test dossier for batch delete"
        })
        assert dossier_res.status_code == 200
        dossier_id = dossier_res.json()["id"]
        
        # Upload 3 pieces
        piece_ids = []
        for i in range(3):
            content = f"Batch delete test {i} - {time.time()}".encode()
            with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
                f.write(content)
                f.flush()
                
                with open(f.name, 'rb') as file:
                    files = {'file': (f'batch_delete_{i}.txt', file, 'text/plain')}
                    upload_res = auth_session.post(
                        f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                        files=files
                    )
            
            assert upload_res.status_code == 200
            piece_ids.append(upload_res.json()["id"])
        
        # Verify 3 pieces exist
        list_res = auth_session.get(f"{BASE_URL}/api/dossiers/{dossier_id}/pieces")
        assert list_res.status_code == 200
        assert len(list_res.json()) == 3
        
        # Delete 2 pieces using delete-many
        delete_res = auth_session.post(
            f"{BASE_URL}/api/dossiers/{dossier_id}/pieces/delete-many",
            json={"piece_ids": piece_ids[:2]}
        )
        
        assert delete_res.status_code == 200, f"Delete many failed: {delete_res.text}"
        data = delete_res.json()
        assert data.get("deleted_count") == 2, f"Expected 2 deleted, got {data.get('deleted_count')}"
        
        # Verify only 1 piece remains
        list_res = auth_session.get(f"{BASE_URL}/api/dossiers/{dossier_id}/pieces")
        assert len(list_res.json()) == 1
        
        print(f"✓ Batch delete: 2 pieces deleted, 1 remaining")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/dossiers/{dossier_id}")


class TestP0FilePreviewTypes:
    """P0: Test file preview for different file types"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code != 200:
            reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            data = reg_res.json()
        else:
            data = login_res.json()
        session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
        return session
    
    def test_preview_returns_correct_content_type(self, auth_session):
        """P0: Preview should return correct content-type for images"""
        # Create dossier
        dossier_res = auth_session.post(f"{BASE_URL}/api/dossiers", json={
            "title": "TEST_P0_Preview_Types",
            "description": "Test preview content types"
        })
        assert dossier_res.status_code == 200
        dossier_id = dossier_res.json()["id"]
        
        # Create a simple PNG image (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(png_data)
            f.flush()
            
            with open(f.name, 'rb') as file:
                files = {'file': ('test_image.png', file, 'image/png')}
                upload_res = auth_session.post(
                    f"{BASE_URL}/api/dossiers/{dossier_id}/pieces",
                    files=files
                )
        
        assert upload_res.status_code == 200
        piece_id = upload_res.json()["id"]
        
        # Get preview
        preview_res = auth_session.get(f"{BASE_URL}/api/pieces/{piece_id}/preview")
        assert preview_res.status_code == 200
        
        content_type = preview_res.headers.get("content-type", "")
        assert "image/png" in content_type, f"Expected image/png, got {content_type}"
        
        print(f"✓ Preview content-type: {content_type}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/dossiers/{dossier_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
