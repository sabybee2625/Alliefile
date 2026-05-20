# AlliéFile — PRD

## Version 1.4.0 — Admin + Stripe webhooks + Tests pytest (2026-05-02)

### Original Problem Statement
Plateforme SaaS juridique pour la constitution, la structuration, le partage et l'argumentation de dossiers juridiques, commercialisée sous le nom **AlliéFile — Votre allié juridique intelligent**.

---

## Ce qui est livré (cumulé)

### v1.3.0 — Mission AlliéFile (landing + rebranding + SEO + email)
- ✅ Rebranding complet (app, FastAPI, 404, Dashboard, Pricing)
- ✅ Landing page publique sur `/` (Header, Hero, 3 étapes, Avantages, Tarifs, CTA, Footer)
- ✅ Page 404 sur route `*` avec bouton retour
- ✅ Plans Découverte (0€) / **Essentiel 14,90€** / **Pro 39,90€** — alias essentiel/pro ↔ standard/premium (compat DB)
- ✅ SEO technique : title, meta description, Open Graph, Twitter Card, canonical, JSON-LD, `lang="fr"`, robots.txt, sitemap.xml
- ✅ Email de bienvenue via Resend (non-bloquant via BackgroundTasks, skip silencieux si clé absente)

### v1.4.0 — Admin + Stripe production-ready + Tests
- ✅ **Module admin backend** `/app/backend/admin.py` (gated par `ADMIN_EMAILS`)
  - `GET /api/admin/me` — vérification accès
  - `GET /api/admin/stats` — users, dossiers, pièces, revenu, transactions, promos
  - `GET /api/admin/users?q=&plan=&limit=` — recherche users
  - `PATCH /api/admin/users/{id}/plan` — changer le plan d'un user (accepte slugs publics)
  - `GET/POST/DELETE /api/admin/promo-codes` — CRUD codes promo
  - `GET /api/admin/transactions?status=` — historique paiements
- ✅ **UI Admin** `/app/frontend/src/pages/Admin.jsx` — 4 onglets (Stats / Users / Promos / Transactions)
- ✅ **Webhooks Stripe étendus** `/api/webhook/stripe` :
  - `checkout.session.completed` → marque transaction payée + upgrade user plan
  - `invoice.payment_succeeded` → étend la période
  - `invoice.payment_failed` → flag user `past_due`
  - `customer.subscription.deleted` → flag `canceled`
  - `customer.subscription.updated` → MAJ plan
- ✅ **Clés Stripe test** mises à jour dans `/app/backend/.env`
- ✅ **Tests pytest** `/app/backend/tests/test_smoke.py` — 7/7 (health, plans, register, login, alias, admin 403, webhook)
- ✅ **Testing agent itération_8** : 20/20 backend + 100% frontend

---

## Configuration Production

### Variables d'environnement critiques
| Variable | Scope | Notes |
|---|---|---|
| `MONGO_URL` | protégée | MongoDB Atlas |
| `DB_NAME` | protégée | `justice-hub-45-alliefile` |
| `STORAGE_BACKEND` | `emergent` | **NE PAS CHANGER** |
| `JWT_SECRET` | requis prod | déjà configuré |
| `CORS_ORIGINS` | requis prod | restriction domaine |
| `EMERGENT_LLM_KEY` | requis | IA Gemini |
| `STRIPE_API_KEY` | test en preview | sk_test_51TSahk... (**configurer prod**) |
| `STRIPE_PUBLISHABLE_KEY` | test en preview | pk_test_51TSahk... |
| `STRIPE_WEBHOOK_SECRET` | vide | à renseigner depuis dashboard Stripe |
| `RESEND_API_KEY` | ⚠️ absent en preview | **à configurer en prod** |
| `SENDER_EMAIL` | `bonjour@alliefile.com` | défaut |
| `ADMIN_EMAILS` | comma-separated | accès `/admin` (ex: `admin@alliefile.com`) |
| `BETA_ACCESS_CODE` | `ASSO100` | code beta premium |

---

## Architecture

```
/app
├── backend/
│   ├── server.py           # API monolithique (~3000 lignes — refactoring P1 à venir)
│   ├── admin.py            # ✅ Routes admin (register_admin_routes)
│   ├── emailing.py         # ✅ Resend welcome email
│   ├── payments.py         # SUBSCRIPTION_PLANS + normalize_plan_id
│   ├── config.py           # PLAN_LIMITS + PLAN_ALIASES
│   ├── storage.py          # EmergentObjectStorage (persistant)
│   ├── rate_limiter.py     # Slowapi wrapper
│   ├── security.py         # Middlewares
│   ├── pytest.ini          # ✅ asyncio_mode=auto
│   └── tests/
│       ├── conftest.py     # ✅ base_url + unique_email fixtures
│       └── test_smoke.py   # ✅ 7 tests contre backend live
└── frontend/
    ├── public/
    │   ├── index.html      # SEO complet
    │   ├── robots.txt      # ✅
    │   └── sitemap.xml     # ✅
    └── src/
        ├── App.js          # Routes: /, /login, /register, /pricing, /cgu, /privacy, /dashboard, /dossier/:id, /admin, * (404)
        ├── lib/api.js      # + adminApi
        └── pages/
            ├── Landing.jsx     # ✅
            ├── NotFound.jsx    # ✅
            ├── Admin.jsx       # ✅ (Stats/Users/Promos/Txs)
            ├── Pricing.jsx     # Essentiel/Pro
            ├── Dashboard.jsx
            ├── DossierView.jsx
            └── ...
```

---

## Backlog restant

### ⚠️ Côté utilisateur en prod
- [ ] **Configurer `RESEND_API_KEY`** en prod (sinon pas d'email de bienvenue)
- [ ] Vérifier domaine `alliefile.com` dans Resend (SPF/DKIM)
- [ ] **Configurer `ADMIN_EMAILS`** en prod (email admin)
- [ ] **Configurer `STRIPE_WEBHOOK_SECRET`** en prod (Dashboard Stripe → webhooks → endpoint `https://alliefile.com/api/webhook/stripe`)
- [ ] Migrer vers les vraies clés Stripe **live** (`sk_live_`, `pk_live_`) avant activation commerciale
- [ ] Fournir vraie `og-image.png` (1200×630) dans `/app/frontend/public/`

### P1 - Prioritaire (session dédiée recommandée)
- [ ] **Refactoring `server.py` (~3000 lignes)** en modules :
  - `auth_routes.py` (register, login, me, stats)
  - `dossiers_routes.py` (CRUD dossiers)
  - `pieces_routes.py` (upload, analyze, validate, download, reupload)
  - `sharing_routes.py` (share links)
  - `payments_routes.py` (checkout, webhook, status, promo-codes public)
  - `account_routes.py` (delete, cancel-deletion, beta/activate)
  - Risque de régression élevé → demande une session dédiée avec tests pytest après chaque extraction

### P2 - Important
- [ ] Étendre les tests pytest : dossiers CRUD, pieces upload/download, sharing, promo codes E2E
- [ ] Optimisation N+1 queries sur `list_dossiers`
- [ ] Refonte esthétique du Dashboard
- [ ] Pagination sur `/admin/users` (actuellement limite 100)
- [ ] Export CSV des transactions pour la compta

### P3 - Nice to have
- [ ] PWA (mobile)
- [ ] Blog SEO (content marketing)
- [ ] Témoignages / études de cas sur la landing
- [ ] Relance email si dossier non rempli après 48h
- [ ] Dashboard admin avec graphes (revenu mensuel, conversion)
- [ ] Tests E2E Playwright dans CI

---

## DB Schema
- `users` : `{ id, email, name, password_hash, plan, plan_status, plan_expires_at, current_period_end, stripe_customer_id, assistant_uses_today, created_at }`
- `dossiers` : `{ id, title, description, user_id, created_at, updated_at }`
- `pieces` : `{ id, dossier_id, numero, filename, file_hash, file_size, file_missing, status, ai_proposal, validated_data }`
- `share_links` : `{ id, dossier_id, token, expires_at, piece_ids }`
- `payment_transactions` : `{ id, user_id, user_email, session_id, plan_id, billing_period, amount, currency, promo_code, discount_applied, status, created_at, updated_at }`
- `promo_codes` : `{ id, code, discount_percent, discount_amount, max_uses, uses, expires_at, plan_restriction, created_at }`

---

## Testing
- **Pytest backend** : `cd /app/backend && python -m pytest tests/ -v` — 7/7 (smoke)
- **Testing agent iteration_8** : 20/20 backend + 100% frontend (admin + rebrand + webhooks)

---

## Hotfix 2026-05-19 — Erreur "Dossier non trouvé" (prod alliefile.com + preview)

### Symptômes
- Liste des dossiers affichée OK, mais à l'ouverture d'un dossier : toast "Erreur lors du chargement" + "Dossier non trouvé"
- Logs backend : `GET /api/dossiers/{id}/pieces` → 500 Internal Server Error
- Stack: `pydantic_core.ValidationError: 3 validation errors for PieceResponse — ai_proposal.type_piece / type_confidence / titre Field required`
- Cause : le classifieur déterministe (`piece_classifier.py` via `POST /dossiers/{id}/reclassify`) écrivait des `ai_proposal` partiels (`{tags_thematiques, sujets_concernes, nature_document}`) sur des pièces sans `validated_data` ni `ai_proposal` existant, donc sans `type_piece`/`titre`/`type_confidence`.

### Fix appliqué (backend/server.py)
- `AIProposal.type_piece`, `type_confidence`, `titre` rendus **Optional** (rétro-compatible avec les ai_proposal partiels écrits par le classifieur)
- Frontend non touché : il gère déjà `null` pour ces champs

### Fix .gitignore (bloqueur Cloud Build prod)
- `.gitignore` corrompu (15 duplications des règles `*.env` / `.env*`) nettoyé
- Les fichiers `backend/.env` et `frontend/.env` ne sont plus ignorés → le Cloud Build prochain devrait passer

### Tests
- Reproduction du bug avec pièce contenant `ai_proposal` partiel → 500 avant fix, 200 après fix ✅
- pytest tests/test_smoke.py → 7/7 PASSED (test plan "Pro" → "Sérénité" rafraîchi)

---

## V3 Taxonomie 3 niveaux — 2026-05-19

### Nouveaux champs sur chaque pièce (dans `validated_data` ou `ai_proposal`)
- `tags_thematiques: List[str]` — 5 domaines canoniques (PÉNAL / FAMILLE / LOGEMENT / TRAVAIL / CIVIL)
- `sous_domaine: str?` — ex: "Violence conjugale", "Litige locatif", "Licenciement"
- `type_specifique: str?` — ex: "physique", "loyers", "abusif"
- `source_qualifiee: 'PRO' | 'PRIVÉ' | null` — dérivée de nature_document

### Backend
- `piece_classifier.py` : `TAXONOMY` 3 niveaux, `SUBDOMAIN_KEYWORDS`, `TYPE_KEYWORDS`, `NATURE_TO_SOURCE`, fonctions `detect_subdomain()` + `derive_source_qualifiee()`
- `server.py` : `AIProposal`/`PieceValidation` étendus, endpoint `/reclassify` saves les 3 nouveaux champs, `/synthesis` retourne `sous_domaines` + `source_by_domain`
- L'endpoint `/reclassify` retraite **toutes** les pièces (plus de skip)

### Frontend
- `PieceThemeBadges.jsx` : nouveau composant `PieceClassificationBadges` (domaine + sous-domaine + source PRO/PRIVÉ + sujets)
- `PieceFilterBar.jsx` : nouvelle rangée "Sous-catégories" filtrable, hook `usePieceFilters` étendu avec `activeSubdomains/toggleSubdomain`
- `DossierSynthesis.jsx` : section "Sous-catégories" + ratio P/p sur chaque thème principal
- `DossierView.jsx` + `SharedDossier.jsx` : migration vers `PieceClassificationBadges`

