#!/usr/bin/env python3
"""
Backend API Testing for Legal Document Management System
Tests all CRUD operations, authentication, file upload, and AI analysis
"""

import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path
import tempfile

class LegalDocumentAPITester:
    def __init__(self, base_url="https://justice-hub-45.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_dossier_id = None
        self.test_piece_id = None
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)
        
        # Remove Content-Type for file uploads
        if files:
            default_headers.pop('Content-Type', None)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=default_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"test{timestamp}@example.com",
            "password": "password123",
            "name": "Test User"
        }
        
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, test_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_user_id = response['user']['id']
            self.log(f"   Registered user: {response['user']['email']}")
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        success, response = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.test_user_id = response['user']['id']
            self.log(f"   Logged in user: {response['user']['email']}")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def test_create_dossier(self):
        """Test dossier creation"""
        dossier_data = {
            "title": f"Test Dossier {datetime.now().strftime('%H%M%S')}",
            "description": "Test dossier for API testing"
        }
        
        success, response = self.run_test("Create Dossier", "POST", "dossiers", 200, dossier_data)
        if success and 'id' in response:
            self.test_dossier_id = response['id']
            self.log(f"   Created dossier: {response['title']} (ID: {self.test_dossier_id})")
            return True
        return False

    def test_list_dossiers(self):
        """Test listing dossiers"""
        success, response = self.run_test("List Dossiers", "GET", "dossiers", 200)
        if success:
            self.log(f"   Found {len(response)} dossiers")
        return success

    def test_get_dossier(self):
        """Test getting specific dossier"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        success, response = self.run_test("Get Dossier", "GET", f"dossiers/{self.test_dossier_id}", 200)
        return success

    def test_upload_piece(self):
        """Test piece upload"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
        
        # Create a test PDF file
        test_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF"
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            tmp_file.write(test_content)
            tmp_file.flush()
            
            try:
                with open(tmp_file.name, 'rb') as f:
                    files = {'file': ('test_document.pdf', f, 'application/pdf')}
                    success, response = self.run_test(
                        "Upload Piece", 
                        "POST", 
                        f"dossiers/{self.test_dossier_id}/pieces", 
                        200, 
                        files=files
                    )
                    
                if success and 'id' in response:
                    self.test_piece_id = response['id']
                    self.log(f"   Uploaded piece: {response['original_filename']} (ID: {self.test_piece_id})")
                    return True
                return False
            finally:
                os.unlink(tmp_file.name)

    def test_list_pieces(self):
        """Test listing pieces in dossier"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        success, response = self.run_test("List Pieces", "GET", f"dossiers/{self.test_dossier_id}/pieces", 200)
        if success:
            self.log(f"   Found {len(response)} pieces")
        return success

    def test_get_piece(self):
        """Test getting specific piece"""
        if not self.test_piece_id:
            self.log("❌ No test piece ID available")
            return False
            
        success, response = self.run_test("Get Piece", "GET", f"pieces/{self.test_piece_id}", 200)
        return success

    def test_analyze_piece(self):
        """Test AI analysis of piece"""
        if not self.test_piece_id:
            self.log("❌ No test piece ID available")
            return False
            
        self.log("   Note: AI analysis may take a few seconds...")
        success, response = self.run_test("Analyze Piece", "POST", f"pieces/{self.test_piece_id}/analyze", 200)
        if success:
            self.log("   AI analysis completed")
        return success

    def test_validate_piece(self):
        """Test piece validation"""
        if not self.test_piece_id:
            self.log("❌ No test piece ID available")
            return False
            
        validation_data = {
            "type_piece": "autre",
            "date_document": "2024-01-15",
            "titre": "Document de test validé",
            "resume_qui": "Parties impliquées",
            "resume_quoi": "Test de validation",
            "resume_ou": "Lieu de test",
            "resume_element_cle": "Élément clé de test",
            "mots_cles": ["test", "validation", "api"]
        }
        
        success, response = self.run_test("Validate Piece", "POST", f"pieces/{self.test_piece_id}/validate", 200, validation_data)
        return success

    def test_chronology(self):
        """Test chronology view"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        success, response = self.run_test("Get Chronology", "GET", f"dossiers/{self.test_dossier_id}/chronology", 200)
        if success:
            entries = response.get('entries', [])
            self.log(f"   Found {len(entries)} chronology entries")
        return success

    def test_export_csv(self):
        """Test CSV export"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        success, _ = self.run_test("Export CSV", "GET", f"dossiers/{self.test_dossier_id}/export/csv", 200)
        return success

    def test_export_zip(self):
        """Test ZIP export"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        success, _ = self.run_test("Export ZIP", "GET", f"dossiers/{self.test_dossier_id}/export/zip", 200)
        return success

    def test_create_share_link(self):
        """Test share link creation"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        share_data = {
            "dossier_id": self.test_dossier_id,
            "expires_in_days": 7
        }
        
        success, response = self.run_test("Create Share Link", "POST", f"dossiers/{self.test_dossier_id}/share", 200, share_data)
        if success and 'token' in response:
            self.log(f"   Created share link with token: {response['token'][:10]}...")
            return True
        return False

    def test_renumber_pieces(self):
        """Test piece renumbering"""
        if not self.test_dossier_id:
            self.log("❌ No test dossier ID available")
            return False
            
        success, response = self.run_test("Renumber Pieces", "POST", f"dossiers/{self.test_dossier_id}/renumber", 200)
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        if self.test_piece_id:
            self.run_test("Cleanup - Delete Piece", "DELETE", f"pieces/{self.test_piece_id}", 200)
        
        if self.test_dossier_id:
            self.run_test("Cleanup - Delete Dossier", "DELETE", f"dossiers/{self.test_dossier_id}", 200)

def main():
    """Run all tests"""
    tester = LegalDocumentAPITester()
    
    print("🚀 Starting Legal Document Management API Tests")
    print(f"📍 Testing against: {tester.base_url}")
    print("=" * 60)
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_register),
        ("Get Current User", tester.test_get_me),
        ("Create Dossier", tester.test_create_dossier),
        ("List Dossiers", tester.test_list_dossiers),
        ("Get Dossier", tester.test_get_dossier),
        ("Upload Piece", tester.test_upload_piece),
        ("List Pieces", tester.test_list_pieces),
        ("Get Piece", tester.test_get_piece),
        ("Analyze Piece", tester.test_analyze_piece),
        ("Validate Piece", tester.test_validate_piece),
        ("Get Chronology", tester.test_chronology),
        ("Export CSV", tester.test_export_csv),
        ("Export ZIP", tester.test_export_zip),
        ("Create Share Link", tester.test_create_share_link),
        ("Renumber Pieces", tester.test_renumber_pieces),
    ]
    
    # Run tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            tester.log(f"❌ {test_name} - Exception: {str(e)}")
        print()  # Add spacing between tests
    
    # Cleanup
    print("🧹 Cleaning up test data...")
    tester.cleanup_test_data()
    
    # Results
    print("=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())