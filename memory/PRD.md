# AlliéFile — PRD

## Version 1.3.0 - Rebranding "AlliéFile" + Landing publique + SEO + Email bienvenue (2026-05-02)

### Original Problem Statement
Plateforme SaaS juridique pour la constitution, la structuration, le partage et l'argumentation de dossiers juridiques, désormais commercialisée sous le nom **AlliéFile — Votre allié juridique intelligent**.

### Mission "AlliéFile" — Livrée en un seul déploiement
1. ✅ **Rebranding complet** de "Dossier Juridique Intelligent" → "AlliéFile — Votre allié juridique intelligent" (titres, emails, app, FastAPI metadata, header landing, 404).
2. ✅ **Landing page publique** sur `/` avec Header, Hero, Comment ça marche, Avantages, Tarifs, CTA final, Footer.
3. ✅ **Nouveaux plans** : Découverte (Gratuit), Essentiel (14,90€/mois — 149€/an), Pro (39,90€/mois — 399€/an).
4. ✅ **SEO technique** : `<title>`, `<meta description>`, Open Graph, Twitter Card, canonical, JSON-LD `SoftwareApplication`, `lang="fr"`, `robots.txt`, `sitemap.xml`.
5. ✅ **Email de bienvenue** à l'inscription via **Resend** (sender `bonjour@alliefile.com`), non-bloquant via BackgroundTasks FastAPI. Skip silencieux si `RESEND_API_KEY` absente (preview).
6. ✅ **Page 404** avec bouton "Retour à l'accueil".

### Compatibilité plans existants
- Les clés internes DB **`standard`** et **`premium`** sont conservées pour ne pas casser les utilisateurs existants.
- Mappage public ↔ interne :
  - `essentiel` ↔ `standard` (affiché "Essentiel" - 14,90€)
  - `pro` ↔ `premium` (affiché "Pro" - 39,90€)
- `payments.normalize_plan_id()` et `config.resolve_plan_key()` acceptent les deux formes en entrée.

---

## Configuration Production
- [x] MongoDB via Emergent (MONGO_URL)
- [x] DB_NAME: justice-hub-45-alliefile
- [x] **Stockage fichiers: Emergent Object Storage** (persistant, à NE PAS modifier)
- [x] JWT_SECRET sécurisé, CORS configuré
- [x] APP_ENV=production
- [x] **Resend**: `RESEND_API_KEY` (prod uniquement — à configurer côté Emergent prod), `SENDER_EMAIL=bonjour@alliefile.com`

## Fonctionnalités Complètes

### Commerce
- [x] Landing page publique `/` (non-auth)
- [x] Plans: Découverte (gratuit) / Essentiel (14,90€) / Pro (39,90€)
- [x] Intégration Stripe checkout (alias essentiel/pro supportés)
- [x] Codes promo (ASSO100 = Premium)
- [x] Page 404 `*`

### SEO / Acquisition
- [x] Meta title + description FR
- [x] Open Graph + Twitter Card
- [x] Canonical + lang="fr"
- [x] JSON-LD SoftwareApplication (3 offers)
- [x] robots.txt + sitemap.xml
- [x] Google Analytics 4 (G-8H63PHT5SM) + PostHog

### Emailing
- [x] Email de bienvenue (HTML responsive) via Resend, non-bloquant, fire-and-forget
- [x] Fallback silencieux si clé API absente (log INFO, ne casse pas l'inscription)

### Stockage & Fichiers
- [x] **Emergent Object Storage** (cloud persistant)
- [x] Compute SHA256 pour matching des fichiers renommés (bulk re-upload)
- [x] Bandeau "file_missing" sur chaque pièce
- [x] Ré-upload unitaire (POST /api/pieces/{id}/reupload)
- [x] Ré-upload en masse (POST /api/dossiers/{id}/pieces/bulk-reupload)

### Core
- [x] Création/gestion dossiers, upload pièces (PDF/images/DOCX/HEIC)
- [x] Analyse IA (Gemini via Emergent LLM Key), chronologie, exposé des faits
- [x] Partage sélectif avec lien sécurisé + expiration

### Conformité
- [x] CGU, Politique de confidentialité
- [x] Consentement cookies
- [x] Suppression compte différée (7j)

---

## Architecture

### Stack
- **Frontend**: React + Shadcn/UI + React Router
- **Backend**: FastAPI (Python)
- **DB**: MongoDB (Emergent-managed)
- **Stockage fichiers**: Emergent Object Storage
- **IA**: Gemini via Emergent LLM Key
- **Paiements**: Stripe
- **Emailing**: Resend
- **Analytics**: GA4 + PostHog

### Fichiers clés
- `/app/backend/server.py` — API monolithique (à découper P1)
- `/app/backend/config.py` — PLANS + PLAN_ALIASES
- `/app/backend/payments.py` — SUBSCRIPTION_PLANS + normalize_plan_id
- `/app/backend/emailing.py` — Resend (send_welcome_email_background)
- `/app/backend/storage.py` — EmergentObjectStorage
- `/app/frontend/src/App.js` — Routage public/privé/404
- `/app/frontend/src/pages/Landing.jsx` — Landing publique
- `/app/frontend/src/pages/NotFound.jsx` — 404
- `/app/frontend/src/pages/Pricing.jsx` — Essentiel/Pro
- `/app/frontend/public/index.html` — Meta SEO
- `/app/frontend/public/robots.txt`, `sitemap.xml`

---

## API Endpoints Clés
- `POST /api/auth/register` — crée user + envoie email bienvenue (BackgroundTasks)
- `POST /api/auth/login` — login
- `GET /api/payments/plans` — retourne les 2 plans publics (Essentiel/Pro)
- `POST /api/payments/checkout` — accepte essentiel/pro ou standard/premium
- `POST /api/payments/validate-promo` — idem
- `POST /api/pieces/{id}/reupload` — ré-upload unitaire
- `POST /api/dossiers/{id}/pieces/bulk-reupload` — ré-upload en masse avec matching SHA256

---

## Testing
- `/app/test_reports/iteration_7.json` — **100% backend (7/7) + 100% frontend (all critical flows)**
- Testing agent a validé : landing, 404, inscription, login, pricing dynamique, SEO, alias de plans.

---

## Backlog

### P0 (action côté utilisateur en prod)
- [ ] **Configurer `RESEND_API_KEY` en prod** (variable d'env production Emergent)
- [ ] **Vérifier le domaine `alliefile.com` dans Resend** (SPF/DKIM pour délivrabilité)
- [ ] **Déployer en prod** pour activer le nouveau routage / landing / SEO
- [ ] Fournir une vraie `og-image.png` (1200x630) dans `/app/frontend/public/`

### P1 - Prioritaire
- [ ] Refactoring `server.py` (~2900 lignes) en modules (auth, dossiers, pieces, analysis, sharing, payments_routes)
- [ ] Interface d'administration (users, codes promo, transactions)

### P2 - Important
- [ ] Optimisation N+1 queries sur `list_dossiers`
- [ ] Refonte esthétique du Dashboard
- [ ] Webhooks Stripe complets (annulation, renouvellement, échec paiement)
- [ ] Tests pytest dans `/app/backend/tests`

### P3 - Nice to have
- [ ] PWA (mobile)
- [ ] Blog SEO (content marketing)
- [ ] Témoignages / études de cas sur la landing
- [ ] Relance email si dossier non rempli après 48h
