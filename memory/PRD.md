# Dossier Juridique Intelligent - PRD

## Problem Statement
Application web de dossier juridique intelligent destinée à organiser, comprendre et exploiter automatiquement des pièces juridiques. L'utilisateur ne doit pas avoir à remplir manuellement les informations des pièces. Workflow: Je dépose → l'application lit → elle propose → je valide.

## User Personas
- **Avocats** : Organiser les pièces d'un dossier client
- **Particuliers** : Gérer leurs documents juridiques pour une affaire JAF
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

## What's Been Implemented (V2 - Jan 2025)

### A) Exports Juridiques Pro
- [x] Export PDF A4 de la chronologie des faits (structuré, professionnel)
  - En-tête: nom dossier, référence, date génération
  - Chaque entrée: date (JJ/MM/AAAA), titre, type, résumé factuel, référence Pièce X
  - Mise en page sobre Swiss, marges A4
- [x] Export DOCX chronologie narrative
  - Format: "Le <date>, [fait]... (Pièce X)."
  - Un paragraphe par fait
  - Texte modifiable dans Word

### B) Assistant de Rédaction Sécurisé
- [x] Travaille uniquement sur pièces VALIDÉES (jamais PDFs bruts)
- [x] Types de documents: Exposé des faits, Chronologie narrative, Courrier avocat, Requête JAF
- [x] Sélection de période et pièces à inclure
- [x] Règles strictes: pas d'invention, citations (Pièce X), "À confirmer" si non sourcé
- [x] Sortie: affichée + copiable + téléchargeable

### C) Support Fichiers Étendu
- [x] Formats supportés: PDF, JPG, PNG, DOCX, DOC, HEIC (iPhone)
- [x] Conversion HEIC → JPG automatique
- [x] Extraction texte serveur (DOCX, PDF)
- [x] OCR/Vision IA pour images et scans
- [x] Limite configurable (50 Mo par défaut)
- [x] Statut d'analyse: en attente, en cours, terminé, erreur
- [x] Bouton "Relancer l'analyse" pour ré-OCR

### D) Qualité & Confiance
- [x] Niveau de confiance (faible/moyen/fort) affiché avec icônes
- [x] Extrait justificatif mis en évidence dans validation
- [x] Badges de confiance sur chaque champ proposé

### E) Partage Avocat Amélioré
- [x] Accès à la chronologie (onglet dédié)
- [x] Téléchargement PDF chronologie
- [x] Vue des pièces avec résumés

## API Endpoints (V2)
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `CRUD /api/dossiers` - Gestion dossiers
- `POST /api/dossiers/{id}/pieces` - Upload pièce
- `POST /api/pieces/{id}/analyze` - Lancer analyse IA
- `POST /api/pieces/{id}/reanalyze` - Relancer analyse
- `POST /api/pieces/{id}/validate` - Valider pièce
- `GET /api/dossiers/{id}/chronology` - Chronologie
- `GET /api/dossiers/{id}/export/pdf` - Export PDF chronologie
- `GET /api/dossiers/{id}/export/docx` - Export DOCX narrative
- `GET /api/dossiers/{id}/export/csv` - Export CSV sommaire
- `GET /api/dossiers/{id}/export/zip` - Export ZIP pièces
- `POST /api/dossiers/{id}/assistant` - Générer document IA
- `POST /api/dossiers/{id}/share` - Créer lien partage
- `GET /api/shared/{token}` - Vue partagée
- `GET /api/shared/{token}/export/pdf` - PDF pour avocat

## Prioritized Backlog

### P0 (Critical) - ✅ DONE
- All core features implemented

### P1 (High Priority)
- [ ] Recherche full-text dans les pièces
- [ ] Drag & drop pour réordonner les pièces
- [ ] Export PDF du résultat assistant
- [ ] Prévisualisation des fichiers dans l'interface

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
2. Ajouter prévisualisation fichiers
3. Export PDF du résultat assistant
4. Drag & drop réordonnement pièces
