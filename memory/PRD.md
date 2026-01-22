# Dossier Juridique Intelligent - PRD

## Problem Statement
Application web (MVP) de dossier juridique intelligent destinée à organiser, comprendre et exploiter automatiquement des pièces juridiques. L'utilisateur ne doit pas avoir à remplir manuellement les informations des pièces. Workflow: Je dépose → l'application lit → elle propose → je valide.

## User Personas
- **Avocats** : Organiser les pièces d'un dossier client
- **Particuliers** : Gérer leurs documents juridiques pour une affaire
- **Paralegaux** : Préparer et classer les pièces pour les avocats

## Core Requirements (Static)
1. Upload de documents (PDF, JPG, PNG, DOCX)
2. Analyse IA automatique (type, date, titre, résumé factuel, mots-clés)
3. Indices de confiance pour chaque proposition
4. Validation/modification par l'utilisateur
5. Numérotation stable des pièces
6. Vue chronologique des faits
7. Exports (CSV, ZIP)
8. Liens de partage sécurisés pour avocats (lecture seule)
9. Authentification JWT

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: GPT-5.2 (via Emergent LLM Key) + Gemini 2.5 Flash pour analyse documents

## What's Been Implemented (Dec 2025)
- [x] Authentification JWT (register/login/logout)
- [x] CRUD complet des dossiers
- [x] Upload de pièces (PDF, images, DOCX)
- [x] Analyse IA avec Gemini 2.5 Flash (extraction type, date, titre, résumé)
- [x] Interface de validation des propositions IA
- [x] Numérotation automatique des pièces
- [x] Vue chronologique
- [x] Export CSV du sommaire
- [x] Export ZIP des pièces
- [x] Liens de partage sécurisés (7 jours expiration)
- [x] Vue partagée lecture seule pour avocats
- [x] Design Swiss minimalist (Archivo/Inter, slate/sky colors)

## Prioritized Backlog

### P0 (Critical)
- ✅ All P0 features implemented

### P1 (High Priority - Next Phase)
- [ ] Export PDF de la chronologie des faits
- [ ] Amélioration OCR pour documents scannés
- [ ] Recherche full-text dans les pièces
- [ ] Drag & drop pour réordonner les pièces

### P2 (Medium Priority)
- [ ] Tags/catégories personnalisées
- [ ] Historique des modifications
- [ ] Export DOCX de la chronologie
- [ ] Notifications par email

### P3 (Nice to Have)
- [ ] Mode sombre
- [ ] Application mobile PWA
- [ ] Intégration Google Drive
- [ ] Multi-utilisateurs par dossier

## Next Tasks List
1. Ajouter export PDF de la chronologie
2. Implémenter recherche full-text
3. Améliorer l'analyse IA avec plus de types de documents
4. Ajouter drag & drop pour l'ordre des pièces
