# Dossier Juridique Intelligent - PRD

## Problem Statement
Application web SaaS de dossier juridique intelligent destinée à organiser, comprendre et exploiter automatiquement des pièces juridiques. Workflow: Je dépose → l'application lit → elle propose → je valide.

## User Personas
- **Avocats** : Organiser les pièces d'un dossier client
- **Particuliers** : Gérer leurs documents juridiques pour une affaire
- **Paralegaux** : Préparer et classer les pièces pour les avocats

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python) avec architecture modulaire
- **Database**: MongoDB
- **AI**: Gemini 2.5 Flash via Emergent LLM Key
- **Payments**: Stripe (abonnements)
- **Storage**: Local (abstraite pour migration S3/R2)

## V4.0 - Transformation SaaS (Fév 2025)

### 1️⃣ SÉCURITÉ & INFRASTRUCTURE ✅ DONE

#### Configuration centralisée (`config.py`)
- [x] JWT_SECRET obligatoire en production (refus démarrage si absent)
- [x] CORS restreint au domaine frontend en production
- [x] Mode development/production configurable (APP_ENV)
- [x] Variables d'environnement pour tous les secrets

#### Rate Limiting (`rate_limiter.py`)
- [x] Login: 5 requêtes/minute par IP
- [x] Register: 3 requêtes/minute par IP
- [x] Analyse IA: 10 requêtes/minute par utilisateur
- [x] Assistant: 5 requêtes/minute par utilisateur

#### Middlewares de sécurité (`security.py`)
- [x] SecurityHeadersMiddleware (X-Frame-Options, HSTS, etc.)
- [x] ErrorHandlingMiddleware (pas de stack trace en prod)
- [x] AccessLogMiddleware (logs d'accès aux endpoints sensibles)

#### Abstraction de stockage (`storage.py`)
- [x] Interface abstraite StorageBackend
- [x] LocalStorage implémenté
- [x] S3Storage préparé (AWS S3, Cloudflare R2, MinIO)
- [x] Migration facile via STORAGE_BACKEND env var

### 2️⃣ SYSTÈME DE PLANS & LIMITES ✅ DONE

#### Plans définis
- **Free**: 1 dossier, 20 pièces, 3 liens partage, 1 assistant/jour, pas de DOCX
- **Standard** (9.90€/mois): 5 dossiers, 500 pièces, exports PDF+DOCX, assistant illimité
- **Premium** (19.90€/mois): Illimité, support prioritaire

#### Vérification des limites
- [x] Middleware check_plan_limit() sur création dossier/pièce
- [x] Statistiques utilisateur via /api/auth/stats
- [x] Affichage limites dans le dashboard

### 3️⃣ MONÉTISATION STRIPE ✅ DONE

#### Endpoints de paiement
- [x] GET /api/payments/plans - Liste des plans
- [x] POST /api/payments/checkout - Création session Stripe
- [x] GET /api/payments/status/{session_id} - Vérification paiement
- [x] POST /api/webhook/stripe - Webhooks Stripe
- [x] POST /api/payments/promo-codes - Création codes promo
- [x] POST /api/payments/validate-promo - Validation codes promo

#### Frontend paiement (`Pricing.jsx`)
- [x] Page de tarifs avec 3 plans
- [x] Toggle mensuel/annuel (-17%)
- [x] Validation codes promo
- [x] Redirection vers Stripe Checkout
- [x] Gestion success/cancel

### 4️⃣ DASHBOARD UTILISATEUR ✅ DONE

- [x] Affichage du plan actuel
- [x] Statistiques: dossiers, pièces, stockage, liens actifs
- [x] Bouton upgrade vers plan supérieur
- [x] Limites affichées (X / max)

## Fonctionnalités précédentes (V1-V3)

### Core Features ✅
- [x] Authentification JWT
- [x] CRUD Dossiers avec isolation par utilisateur
- [x] Upload pièces (PDF, JPG, PNG, DOCX, DOC, HEIC)
- [x] Détection doublons SHA256 avec modale frontend
- [x] Analyse IA automatique via file d'attente
- [x] Validation pièces avec indices de confiance
- [x] Numérotation automatique stable
- [x] Prise de photo native (mobile/desktop)

### Exports ✅
- [x] PDF chronologie professionnelle
- [x] DOCX chronologie narrative
- [x] CSV sommaire
- [x] ZIP des pièces

### Assistant de rédaction ✅
- [x] Exposé des faits
- [x] Chronologie narrative
- [x] Courrier avocat
- [x] Projet de requête (agnostique juridiction)
- [x] Citations obligatoires (Pièce X)

### Partage sécurisé ✅
- [x] Liens expirables (7 jours)
- [x] Vue lecture seule
- [x] Téléchargement pièces
- [x] Export PDF chronologie

### UX Améliorée ✅
- [x] Cartes stats cliquables (filtrage rapide)
- [x] Suppression en lot avec checkboxes
- [x] Prévisualisation fichiers dans modales
- [x] Saisie date améliorée (clavier + calendrier année/mois)

## Prioritized Backlog

### P0 (À faire ensuite) 🔴
- [ ] **Filtrage avancé** : par type, mots-clés, date, statut
- [ ] **Recherche plein texte** : titre + résumé validé
- [ ] **Partage sélectif** : choisir pièces/filtre à partager
- [ ] **Logs d'accès partage** : date, IP, téléchargements

### P1 (Important) 🟡
- [ ] Expiration partage configurable (1-30 jours)
- [ ] Révocation manuelle des liens
- [ ] Export ciblé (filtré)
- [ ] Protection partage par mot de passe

### P2 (Medium) 🟠
- [ ] Migration effective vers S3/R2
- [ ] Panel admin pour codes promo
- [ ] Historique d'activité utilisateur
- [ ] Notifications par email

### P3 (Nice to have) 🔵
- [ ] Mode sombre
- [ ] Application mobile PWA
- [ ] Multi-utilisateurs par dossier
- [ ] Intégration Google Drive

## API Endpoints (V4)

### Auth
- POST /api/auth/register - Inscription (rate limited)
- POST /api/auth/login - Connexion (rate limited)
- GET /api/auth/me - Profil utilisateur
- GET /api/auth/stats - Statistiques utilisateur

### Payments
- GET /api/payments/plans - Plans disponibles
- POST /api/payments/checkout - Créer session paiement
- GET /api/payments/status/{session_id} - Statut paiement
- POST /api/payments/validate-promo - Valider code promo
- POST /api/payments/promo-codes - Créer code promo
- POST /api/webhook/stripe - Webhook Stripe

### Dossiers
- CRUD /api/dossiers (avec limites plan)
- POST /api/dossiers/{id}/renumber

### Pièces
- POST /api/dossiers/{id}/pieces (upload avec doublon check)
- GET /api/pieces/{id}/file (auth required)
- POST /api/pieces/{id}/analyze (rate limited)
- POST /api/dossiers/{id}/queue-analysis
- POST /api/dossiers/{id}/pieces/delete-many

### Exports
- GET /api/dossiers/{id}/export/pdf
- GET /api/dossiers/{id}/export/docx
- GET /api/dossiers/{id}/export/csv
- GET /api/dossiers/{id}/export/zip

### Assistant
- POST /api/dossiers/{id}/assistant (rate limited)

### Partage
- POST /api/dossiers/{id}/share
- GET /api/shared/{token}

## Environment Variables

### Required
- MONGO_URL - MongoDB connection string
- JWT_SECRET - Secret for JWT tokens (REQUIRED in production)
- CORS_ORIGINS - Allowed origins (REQUIRED in production)

### Optional
- APP_ENV - development | production (default: development)
- STORAGE_BACKEND - local | s3 | r2 (default: local)
- STRIPE_API_KEY - Stripe API key
- EMERGENT_LLM_KEY - LLM integration key
- RATE_LIMIT_* - Various rate limits

### S3/R2 (for production storage)
- S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_ENDPOINT_URL

## Files Structure

```
/app/backend/
├── server.py       # Main FastAPI app
├── config.py       # Centralized configuration
├── rate_limiter.py # Rate limiting
├── security.py     # Security middlewares
├── storage.py      # Storage abstraction
├── payments.py     # Stripe integration
└── .env            # Environment variables

/app/frontend/src/
├── pages/
│   ├── Dashboard.jsx   # With plan info
│   ├── DossierView.jsx # Main view
│   ├── Pricing.jsx     # Subscription plans
│   └── ...
├── components/
│   ├── CameraCapture.jsx
│   ├── DateInput.jsx
│   ├── FilePreviewModal.jsx
│   └── ...
└── lib/
    └── api.js         # API client with userApi
```
