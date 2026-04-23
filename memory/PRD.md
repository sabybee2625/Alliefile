# Dossier Juridique Intelligent - PRD

## Version 1.2.0 - GridFS + Ré-upload fichiers manquants

### Original Problem Statement
Plateforme SaaS juridique pour la constitution, la structuration, le partage et l'argumentation de dossiers juridiques.

---

## Configuration Production
- [x] MongoDB via Emergent (MONGO_URL injectée automatiquement)
- [x] DB_NAME: justice-hub-45-alliefile
- [x] **Stockage fichiers: MongoDB GridFS** (persistant entre déploiements)
- [x] JWT_SECRET sécurisé
- [x] CORS configuré
- [x] APP_ENV=production

## Fonctionnalités Complètes

### Stockage & Fichiers
- [x] Upload vers GridFS (persistant cloud)
- [x] Download/Preview depuis GridFS
- [x] Détection automatique `file_missing` sur chaque pièce
- [x] Ré-upload de fichiers manquants (POST /api/pieces/{id}/reupload)
- [x] Bandeau d'alerte UI pour fichiers manquants
- [x] Bouton "Ré-uploader" sur les pièces avec fichier perdu
- [x] Export ZIP depuis GridFS
- [x] Partage de fichiers depuis GridFS

### Core
- [x] Création/gestion de dossiers
- [x] Upload de pièces (PDF, images, DOCX, HEIC)
- [x] Analyse IA (Gemini via Emergent LLM Key)
- [x] Validation des pièces
- [x] Chronologie automatique
- [x] Génération d'exposé des faits
- [x] Partage sélectif de pièces

### Abonnements & Accès
- [x] Quotas FREE (1 dossier, 15 pièces)
- [x] Intégration Stripe
- [x] Code Beta ASSO100 (upgrade Premium)

### Conformité
- [x] Pages légales (CGU, Privacy)
- [x] Consentement cookies
- [x] Suppression compte différée (7 jours)
- [x] Google Analytics 4

### UX
- [x] Détection interactive des doublons
- [x] Preview .docx
- [x] Filtres par type de pièce
- [x] Sélection granulaire pour partage/export

---

## Architecture

### Stack
- **Frontend**: React + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB (Emergent-managed)
- **Stockage fichiers**: MongoDB GridFS (collection `file_storage`)
- **IA**: Gemini via Emergent LLM Key
- **Paiements**: Stripe
- **Analytics**: Google Analytics 4

### Fichiers clés
- `/app/backend/server.py` - API monolithique
- `/app/backend/storage.py` - Abstraction stockage (Local, GridFS, S3)
- `/app/backend/config.py` - Configuration
- `/app/frontend/src/lib/api.js` - Client API
- `/app/frontend/src/pages/DossierView.jsx` - Vue dossier (avec ré-upload)

---

## DB Schema
- `users`: `{ id, name, email, hashed_password, plan, plan_status, current_period_end, scheduled_deletion_at }`
- `dossiers`: `{ id, title, description, user_id }`
- `pieces`: `{ id, dossier_id, numero, filename, original_filename, file_type, file_size, file_hash, status, ai_proposal, validated_data }`
- `share_links`: `{ id, dossier_id, token, expires_at, piece_ids }`
- `file_storage.files` + `file_storage.chunks`: GridFS collections

## API Endpoints Clés
- `POST /api/pieces/{id}/reupload` - Ré-upload fichier manquant
- `GET /api/dossiers/{id}/pieces` - Liste avec `file_missing` flag
- `GET /api/health` - Inclut `storage_backend: gridfs`

---

## Backlog

### P1 - Prioritaire
- [ ] Refactoring `server.py` (2700+ lignes) en modules

### P2 - Important
- [ ] Optimisation N+1 queries (`list_dossiers`)
- [ ] Interface d'administration (codes promo, utilisateurs)
- [ ] Refonte esthétique du Dashboard

### P3 - Nice to have
- [ ] PWA (application mobile)
- [ ] Webhooks Stripe
