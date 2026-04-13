# Dossier Juridique Intelligent - PRD

## Version 1.1.0 - GridFS Storage Migration

### Original Problem Statement
Plateforme SaaS juridique pour la constitution, la structuration, le partage et l'argumentation de dossiers juridiques. Destinée aux particuliers accompagnés par des professionnels (avocats, associations).

---

## V1 Production Ready

### Configuration Production
- [x] MongoDB Atlas connecté (`alliefile-dossier.u4ejts9.mongodb.net`)
- [x] JWT_SECRET sécurisé (256-bit)
- [x] CORS restreint au domaine frontend
- [x] APP_ENV=production
- [x] Persistance données validée
- [x] **Stockage fichiers sur MongoDB GridFS** (migration depuis local)

### Tests Validés
| Fonctionnalité | Status |
|----------------|--------|
| Création compte | Done |
| Création dossier | Done |
| Upload pièces (GridFS) | Done |
| Download pièces (GridFS) | Done |
| Preview pièces (GridFS) | Done |
| Partage fichiers (GridFS) | Done |
| Export ZIP (GridFS) | Done |
| Suppression fichiers (GridFS) | Done |
| Analyse IA (PDF) | Done |
| Validation pièce | Done |
| Génération expose_faits | Done |
| Partage lien 7 jours | Done |
| Quotas FREE (1 dossier, 15 pièces) | Done |
| Révocation lien | Done |
| Suppression compte | Done |
| Consentement cookies | Done |
| Pages légales (CGU, Privacy) | Done |
| Code Beta ASSO100 | Done |
| Google Analytics 4 | Done |
| Détection doublons interactive | Done |
| Preview .docx | Done |
| Filtres par type de pièce | Done |
| Partage sélectif de pièces | Done |
| Suppression compte différée (7 jours) | Done |

---

## Architecture

### Storage Backend
- **STORAGE_BACKEND=gridfs** dans `.env`
- Fichiers stockés dans MongoDB GridFS (collection `file_storage`)
- Abstraction via `StorageBackend` (supporte local, S3, R2, GridFS)
- Migration script: `migrate_to_gridfs.py`

### Stack Technique
- **Frontend**: React + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB Atlas
- **Stockage fichiers**: MongoDB GridFS
- **IA**: Gemini via Emergent LLM Key
- **Paiements**: Stripe (config test)
- **Analytics**: Google Analytics 4

### Fichiers clés
- `/app/backend/server.py` - API monolithique (à refactorer)
- `/app/backend/storage.py` - Abstraction stockage (Local, GridFS, S3)
- `/app/backend/config.py` - Configuration
- `/app/backend/migrate_to_gridfs.py` - Script de migration
- `/app/frontend/src/lib/api.js` - Client API
- `/app/frontend/src/pages/DossierView.jsx` - Vue dossier
- `/app/frontend/src/pages/Dashboard.jsx` - Dashboard

---

## Backlog

### P1 - Prioritaire
- [ ] Refactoring `server.py` (2500+ lignes) en modules

### P2 - Important
- [ ] Optimisation N+1 queries (`list_dossiers`)
- [ ] Interface d'administration (codes promo, utilisateurs)
- [ ] Refonte esthétique du Dashboard

### P3 - Nice to have
- [ ] Conversion en application mobile (PWA)
- [ ] Webhooks Stripe

---

## DB Schema
- `users`: `{ id, name, email, hashed_password, plan, plan_status, current_period_end, scheduled_deletion_at }`
- `dossiers`: `{ id, title, description, user_id }`
- `pieces`: `{ id, dossier_id, numero, filename, original_filename, file_type, file_size, file_hash, status, ai_proposal, validated_data }`
- `share_links`: `{ id, dossier_id, token, expires_at, piece_ids: List[str] }`
- `file_storage.files` + `file_storage.chunks`: GridFS collections
