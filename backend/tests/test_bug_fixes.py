"""
Test suite for 3 critical bug fixes:
A) Preview button in PieceValidationModal opens FilePreviewModal (DOCX shows 'preview not available' + download button)
B) Duplicate detection returns 409 with detailed info (existing_piece_id, existing_piece_numero, existing_filename)
C) DOCX upload preserves file size (not 0 bytes), empty files rejected with 400
"""
import pytest
import requests
import os
import hashlib
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test_phase4@test.com"
TEST_PASSWORD = "Test123!"
TEST_DOSSIER_ID = "3b1c7309-4808-4330-9838-b7239045cd34"

# Test file paths
TEST_DOCX_PATH = "/tmp/test_document.docx"
EMPTY_FILE_PATH = "/tmp/empty_file.docx"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestBugC_DocxUploadPreservesSize:
    """Bug C: DOCX upload should preserve file size (not become 0 bytes)"""
    
    def test_docx_upload_preserves_size(self, auth_headers):
        """Upload a DOCX file and verify file_size is preserved"""
        # Get original file size
        original_size = os.path.getsize(TEST_DOCX_PATH)
        assert original_size > 0, "Test file should not be empty"
        print(f"Original DOCX size: {original_size} bytes")
        
        # Upload the file
        with open(TEST_DOCX_PATH, 'rb') as f:
            files = {'file': ('test_upload.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response = requests.post(
                f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
                headers=auth_headers,
                files=files
            )
        
        assert response.status_code in [200, 201], f"Upload failed: {response.status_code} - {response.text}"
        
        piece_data = response.json()
        uploaded_size = piece_data.get('file_size', 0)
        piece_id = piece_data.get('id')
        
        print(f"Uploaded piece ID: {piece_id}")
        print(f"Uploaded file_size in response: {uploaded_size} bytes")
        
        # CRITICAL: Verify file size is preserved
        assert uploaded_size > 0, f"BUG C: file_size is 0 bytes! Expected {original_size}"
        assert uploaded_size == original_size, f"File size mismatch: expected {original_size}, got {uploaded_size}"
        
        # Store piece_id for cleanup and further tests
        self.__class__.uploaded_piece_id = piece_id
        self.__class__.uploaded_file_hash = piece_data.get('file_hash')
        
        print(f"✓ Bug C PASSED: DOCX upload preserved size ({uploaded_size} bytes)")
    
    def test_download_returns_identical_file(self, auth_headers):
        """Download the uploaded file and verify SHA256 hash matches"""
        piece_id = getattr(self.__class__, 'uploaded_piece_id', None)
        if not piece_id:
            pytest.skip("No piece uploaded in previous test")
        
        # Download the file
        response = requests.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Download failed: {response.status_code}"
        
        downloaded_content = response.content
        downloaded_hash = hashlib.sha256(downloaded_content).hexdigest()
        
        # Calculate original file hash
        with open(TEST_DOCX_PATH, 'rb') as f:
            original_hash = hashlib.sha256(f.read()).hexdigest()
        
        print(f"Original file hash: {original_hash}")
        print(f"Downloaded file hash: {downloaded_hash}")
        
        assert downloaded_hash == original_hash, f"Hash mismatch! File corrupted during upload/download"
        print(f"✓ Bug C.2 PASSED: Downloaded file hash matches original")
    
    def test_empty_file_rejected_with_400(self, auth_headers):
        """Empty files (0 bytes) should be rejected with HTTP 400"""
        with open(EMPTY_FILE_PATH, 'rb') as f:
            files = {'file': ('empty.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response = requests.post(
                f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
                headers=auth_headers,
                files=files
            )
        
        assert response.status_code == 400, f"Expected 400 for empty file, got {response.status_code}"
        print(f"✓ Bug C.3 PASSED: Empty file rejected with 400")


class TestBugB_DuplicateDetection:
    """Bug B: Duplicate detection should return 409 with detailed info"""
    
    def test_duplicate_upload_returns_409_with_details(self, auth_headers):
        """Upload same file twice - second upload should return 409 with details"""
        # First upload (should succeed)
        with open(TEST_DOCX_PATH, 'rb') as f:
            files = {'file': ('duplicate_test.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response1 = requests.post(
                f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
                headers=auth_headers,
                files=files
            )
        
        # Could be 200/201 (new) or 409 (already exists from previous test)
        if response1.status_code == 409:
            # File already exists, use the existing info
            detail = response1.json().get('detail', {})
            existing_piece_id = detail.get('existing_piece_id')
            existing_piece_numero = detail.get('existing_piece_numero')
            existing_filename = detail.get('existing_filename')
        else:
            assert response1.status_code in [200, 201], f"First upload failed: {response1.text}"
            piece1 = response1.json()
            existing_piece_id = piece1['id']
            existing_piece_numero = piece1['numero']
            existing_filename = piece1['original_filename']
        
        print(f"First piece: ID={existing_piece_id}, numero={existing_piece_numero}")
        
        # Second upload (should return 409)
        with open(TEST_DOCX_PATH, 'rb') as f:
            files = {'file': ('duplicate_test_2.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response2 = requests.post(
                f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
                headers=auth_headers,
                files=files
            )
        
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}"
        
        # Verify detailed error response
        error_detail = response2.json().get('detail', {})
        
        assert 'existing_piece_id' in error_detail, "Missing existing_piece_id in 409 response"
        assert 'existing_piece_numero' in error_detail, "Missing existing_piece_numero in 409 response"
        assert 'existing_filename' in error_detail, "Missing existing_filename in 409 response"
        
        print(f"409 response detail: {error_detail}")
        print(f"✓ Bug B PASSED: Duplicate detection returns 409 with all required fields")
        
        # Store for force_upload test
        self.__class__.duplicate_piece_id = existing_piece_id
    
    def test_force_upload_allows_duplicate(self, auth_headers):
        """force_upload=true should allow importing duplicate with is_duplicate=true"""
        with open(TEST_DOCX_PATH, 'rb') as f:
            files = {'file': ('forced_duplicate.docx', f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
            response = requests.post(
                f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces?force_upload=true",
                headers=auth_headers,
                files=files
            )
        
        assert response.status_code in [200, 201], f"Force upload failed: {response.status_code} - {response.text}"
        
        piece_data = response.json()
        is_duplicate = piece_data.get('is_duplicate', False)
        
        assert is_duplicate == True, f"Expected is_duplicate=true, got {is_duplicate}"
        
        print(f"Force uploaded piece: ID={piece_data['id']}, is_duplicate={is_duplicate}")
        print(f"✓ Bug B.2 PASSED: force_upload=true allows duplicate with is_duplicate=true")
        
        # Store for cleanup
        self.__class__.forced_duplicate_id = piece_data['id']


class TestBugA_PreviewInValidation:
    """Bug A: Preview button in validation modal should work for DOCX (show 'not available' + download)"""
    
    def test_preview_endpoint_exists_for_docx(self, auth_headers):
        """Verify preview endpoint returns proper response for DOCX files"""
        # Get a piece with DOCX type
        response = requests.get(
            f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        pieces = response.json()
        docx_piece = next((p for p in pieces if p.get('file_type') == 'docx'), None)
        
        if not docx_piece:
            pytest.skip("No DOCX piece found in test dossier")
        
        piece_id = docx_piece['id']
        print(f"Testing preview for DOCX piece: {piece_id}")
        
        # Preview endpoint should return the file (frontend handles display)
        preview_response = requests.get(
            f"{BASE_URL}/api/pieces/{piece_id}/preview",
            headers=auth_headers
        )
        
        # For DOCX, preview endpoint should still return the file
        # Frontend FilePreviewModal will show "preview not available" message
        assert preview_response.status_code == 200, f"Preview endpoint failed: {preview_response.status_code}"
        
        # Verify content is returned
        assert len(preview_response.content) > 0, "Preview returned empty content"
        
        print(f"✓ Bug A PASSED: Preview endpoint returns content for DOCX (frontend shows 'not available' message)")
    
    def test_file_download_endpoint_works(self, auth_headers):
        """Verify file download endpoint works (for 'Télécharger' button)"""
        response = requests.get(
            f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        pieces = response.json()
        if not pieces:
            pytest.skip("No pieces in test dossier")
        
        piece = pieces[0]
        piece_id = piece['id']
        
        download_response = requests.get(
            f"{BASE_URL}/api/pieces/{piece_id}/file",
            headers=auth_headers
        )
        
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        assert len(download_response.content) > 0, "Download returned empty content"
        
        print(f"✓ Bug A.2 PASSED: File download endpoint works for 'Télécharger' button")


class TestCleanup:
    """Cleanup test pieces created during testing"""
    
    def test_cleanup_test_pieces(self, auth_headers):
        """Delete test pieces to avoid polluting the dossier"""
        # Get all pieces
        response = requests.get(
            f"{BASE_URL}/api/dossiers/{TEST_DOSSIER_ID}/pieces",
            headers=auth_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not fetch pieces for cleanup")
        
        pieces = response.json()
        
        # Find pieces created by this test (by filename pattern)
        test_filenames = ['test_upload.docx', 'duplicate_test.docx', 'duplicate_test_2.docx', 'forced_duplicate.docx']
        pieces_to_delete = [p for p in pieces if p.get('original_filename') in test_filenames]
        
        deleted_count = 0
        for piece in pieces_to_delete:
            del_response = requests.delete(
                f"{BASE_URL}/api/pieces/{piece['id']}",
                headers=auth_headers
            )
            if del_response.status_code in [200, 204]:
                deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test pieces")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
