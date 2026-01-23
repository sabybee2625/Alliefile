# Dossier Juridique Intelligent - PRD

## Problem Statement
Application web de dossier juridique intelligent destinée à organiser, comprendre et exploiter automatiquement des pièces juridiques. L'utilisateur ne doit pas avoir à remplir manuellement les informations des pièces. Workflow: Je dépose → l'application lit → elle propose → je valide.

## User Personas
- **Avocats** : Organiser les pièces d'un dossier client
- **Particuliers** : Gérer leurs documents juridiques pour une affaire
- **Paralegaux** : Préparer et classer les pièces pour les avocats

## Core Requirements (Static)
1. Upload de documents (PDF, JPG, PNG, DOCX, DOC, HEIC)
2. Analyse IA automatique (type, date, titre, résumé factuel, mots-clés)
3. Indices de confiance + extraits justificatifs pour chaque proposition
4. Validation/modification par l'utilisateur
5. Numérotation stable des pièces
6. Vue chronologique des faits
7. Exports professionnels (PDF chronologie, DOCX narrative, CSV, ZIP)
8. Assistant de rédaction sécurisé (basé sur pièces validées uniquement)
9. Liens de partage sécurisés pour avocats (lecture seule + accès chronologie)
10. Authentification JWT

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Gemini 2.5 Flash via Emergent LLM Key

## What's Been Implemented

### V3 - Phase 4 Bug Fixes (Jan 2025)

#### P0 - Téléchargement & Prévisualisation Sécurisés ✅
- [x] Endpoint `/api/pieces/{id}/file` avec authentification JWT
- [x] Endpoint `/api/pieces/{id}/preview` pour prévisualisation inline
- [x] Blocage des accès non authentifiés (401/403)
- [x] `FilePreviewModal.jsx` : modale de prévisualisation intégrée
  - PDF et images : prévisualisation inline
  - DOCX et autres : message + bouton téléchargement
  - Bouton "Télécharger" toujours disponible

#### P1 - Fiabilité Ingestion ✅
- [x] **Détection de doublons (SHA256)** : 
  - Hash calculé à l'upload
  - Retourne 409 si doublon existant
  - Option `force_upload=true` pour importer quand même
  - Badge "Doublon" visible sur les pièces
- [x] **File d'attente d'analyse** :
  - Endpoint `/api/dossiers/{id}/queue-analysis` pour mettre en queue
  - Endpoint `/api/dossiers/{id}/queue-status` pour statuts
  - Limite de 2 analyses concurrentes
  - Statuts : pending, queued, analyzing, complete, error
  - Boutons "Analyser tout" et "Relancer les échecs"
  - Polling automatique de l'état de la queue
- [x] **Suppression en lot** :
  - Endpoint `/api/dossiers/{id}/pieces/delete-many`
  - Mode sélection avec checkboxes
  - Boutons "Tout sélectionner" / "Désélectionner"
  - Bouton "Supprimer (N)" avec confirmation
  - Suppression des pièces en erreur

#### P2 - Ergonomie Saisie des Dates ✅
- [x] **Nouveau composant `DateInput.jsx`** :
  - Saisie clavier format JJ/MM/AAAA avec auto-formatage
  - Bouton calendrier avec popover
  - **Sélecteur de mois** (dropdown)
  - **Sélecteur d'année** (dropdown, 100 ans en arrière)
  - Checkbox "Date inconnue" (met la date à null)
  - Bouton X pour effacer la date

### V2 - Exports & Assistant (Jan 2025)

#### A) Exports Juridiques Pro
- [x] Export PDF A4 de la chronologie des faits (structuré, professionnel)
  - En-tête: nom dossier, référence, date génération
  - Chaque entrée: date (JJ/MM/AAAA), titre, type, résumé factuel, référence Pièce X
  - Mise en page sobre Swiss, marges A4
- [x] Export DOCX chronologie narrative
  - Format: "Le <date>, [fait]... (Pièce X)."
  - Un paragraphe par fait
  - Texte modifiable dans Word

#### B) Assistant de Rédaction Sécurisé (Agnostique)
- [x] Travaille uniquement sur pièces VALIDÉES (jamais PDFs bruts)
- [x] Types de documents: Exposé des faits, Chronologie narrative, Courrier avocat, Projet de requête
- [x] **Sélecteur de juridiction** : Pénal, JAF, Prud'hommes, Administratif, Civil, Commercial
- [x] Sélection de période et pièces à inclure
- [x] Règles strictes: pas d'invention, citations (Pièce X), "À confirmer" si non sourcé
- [x] Sortie: affichée + copiable + téléchargeable

#### C) Support Fichiers Étendu
- [x] Formats supportés: PDF, JPG, PNG, DOCX, DOC, HEIC (iPhone)
- [x] Conversion HEIC → JPG automatique
- [x] Extraction texte serveur (DOCX, PDF)
- [x] OCR/Vision IA pour images et scans
- [x] Limite configurable (50 Mo par défaut)
- [x] Statut d'analyse: en attente, en cours, terminé, erreur
- [x] Bouton "Relancer l'analyse" pour ré-OCR

#### D) Qualité & Confiance
- [x] Niveau de confiance (faible/moyen/fort) affiché avec icônes
- [x] Extrait justificatif mis en évidence dans validation
- [x] Badges de confiance sur chaque champ proposé

#### E) Partage Avocat Amélioré
- [x] Accès à la chronologie (onglet dédié)
- [x] Téléchargement PDF chronologie
- [x] Vue des pièces avec résumés

## API Endpoints (V3)

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### Dossiers
- `CRUD /api/dossiers` - Gestion dossiers
- `POST /api/dossiers/{id}/renumber` - Renuméroter pièces

### Pièces
- `POST /api/dossiers/{id}/pieces` - Upload pièce (avec détection doublons)
- `GET /api/dossiers/{id}/pieces` - Liste pièces
- `GET /api/pieces/{id}/file` - Télécharger fichier (auth requise)
- `GET /api/pieces/{id}/preview` - Prévisualiser fichier (auth requise)
- `POST /api/pieces/{id}/analyze` - Lancer analyse IA
- `POST /api/pieces/{id}/reanalyze` - Relancer analyse
- `POST /api/pieces/{id}/validate` - Valider pièce
- `DELETE /api/pieces/{id}` - Supprimer une pièce
- `POST /api/dossiers/{id}/pieces/delete-many` - Supprimer plusieurs pièces
- `POST /api/dossiers/{id}/pieces/delete-errors` - Supprimer pièces en erreur

### File d'attente
- `POST /api/dossiers/{id}/queue-analysis` - Mettre pièces en queue
- `POST /api/dossiers/{id}/queue-failed` - Re-queue les échecs
- `POST /api/dossiers/{id}/process-queue` - Traiter la queue
- `GET /api/dossiers/{id}/queue-status` - Statut de la queue

### Exports
- `GET /api/dossiers/{id}/chronology` - Chronologie JSON
- `GET /api/dossiers/{id}/export/pdf` - Export PDF chronologie
- `GET /api/dossiers/{id}/export/docx` - Export DOCX narrative
- `GET /api/dossiers/{id}/export/csv` - Export CSV sommaire
- `GET /api/dossiers/{id}/export/zip` - Export ZIP pièces

### Assistant
- `POST /api/dossiers/{id}/assistant` - Générer document IA

### Partage
- `POST /api/dossiers/{id}/share` - Créer lien partage
- `GET /api/shared/{token}` - Vue partagée
- `GET /api/shared/{token}/piece/{id}/file` - Fichier partagé
- `GET /api/shared/{token}/export/pdf` - PDF pour avocat

## Prioritized Backlog

### P0 (Critical) - ✅ DONE
- All core features implemented
- Phase 4 bug fixes completed

### P1 (High Priority)
- [ ] Recherche full-text dans les pièces
- [ ] Drag & drop pour réordonner les pièces
- [ ] Export PDF du résultat assistant

### P2 (Medium Priority)
- [ ] Tags/catégories personnalisées
- [ ] Historique des modifications
- [ ] Statistiques du dossier
- [ ] Notifications par email

### P3 (Nice to Have)
- [ ] Mode sombre
- [ ] Application mobile PWA
- [ ] Intégration Google Drive
- [ ] Multi-utilisateurs par dossier

## Next Tasks List
1. Implémenter recherche full-text
2. Export PDF du résultat assistant
3. Drag & drop réordonnement pièces
4. Tags/catégories personnalisées
