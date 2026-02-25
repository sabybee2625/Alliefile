# Dossier Juridique Intelligent - PRD

## Version 1.0.0 - Ready for Deployment

### Original Problem Statement
Plateforme SaaS juridique pour la constitution, la structuration, le partage et l'argumentation de dossiers juridiques. Destinée aux particuliers accompagnés par des professionnels (avocats, associations).

---

## V1 Deployment Checklist ✅

### 1. Quotas FREE Strictement Appliqués
- [x] **1 dossier max** - HTTP 403 avec message clair
- [x] **15 pièces max** - HTTP 403 avec message clair
- [x] **Assistant limité à expose_faits** - HTTP 403 pour autres types
- [x] Messages d'erreur structurés avec `upgrade_url: "/pricing"`

### 2. Stripe Mise à Jour
- [x] Champs `plan_status` et `current_period_end` ajoutés
- [x] Retour automatique en FREE à l'expiration
- [x] Gestion des abonnements annulés

### 3. Pages Légales
- [x] `/cgu` - Conditions Générales d'Utilisation
- [x] `/privacy` - Politique de Confidentialité
- [x] Disclaimer visible sur le Dashboard

### 4. Suppression Définitive
- [x] `DELETE /api/account` - Supprime tout (fichiers, dossiers, pièces, liens)
- [x] `DELETE /api/dossiers/{id}` - Supprime fichiers + share_links

### 5. Partage 7 Jours
- [x] Expiration vérifiée (HTTP 410)
- [x] Révocation via `DELETE /api/share-links/{id}`
- [x] Endpoint `GET /api/dossiers/{id}/share-links` pour lister

---

## Architecture

```
/app
├── backend/
│   ├── server.py         # FastAPI API principale
│   ├── config.py         # Configuration & Plans
│   ├── payments.py       # Stripe integration
│   ├── storage.py        # Abstraction stockage (local/S3)
│   ├── security.py       # JWT, middlewares
│   └── rate_limiter.py   # Rate limiting
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── DossierView.jsx
│       │   ├── Pricing.jsx
│       │   ├── Legal.jsx       # CGU, Privacy, Disclaimer
│       │   └── SharedDossier.jsx
│       └── lib/api.js
```

---

## Plans & Limites

| Feature | FREE | Standard (9.90€) | Premium (19.90€) |
|---------|------|------------------|------------------|
| Dossiers | 1 | 5 | Illimité |
| Pièces totales | 15 | 500 | Illimité |
| Assistant | expose_faits uniquement | Tous types | Tous types |
| Export DOCX | ❌ | ✅ | ✅ |
| Partage avancé | ❌ | ✅ | ✅ |

---

## Variables d'Environnement Production

### Backend (.env)
```
APP_ENV=production
MONGO_URL=<MongoDB Atlas URI>
DB_NAME=legal_dossier_db
JWT_SECRET=<openssl rand -hex 32>
EMERGENT_LLM_KEY=<clé API>
STRIPE_SECRET_KEY=sk_live_...
CORS_ORIGINS=https://votre-domaine.com
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://api.votre-domaine.com
```

---

## Endpoints Clés

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/register | Inscription (plan free auto) |
| POST | /api/auth/login | Connexion JWT |
| GET | /api/auth/stats | Stats utilisateur + limites |
| POST | /api/dossiers | Créer dossier (vérifie limite) |
| POST | /api/dossiers/{id}/pieces | Upload pièce (vérifie limite) |
| POST | /api/dossiers/{id}/assistant | Générer document (vérifie plan) |
| POST | /api/dossiers/{id}/share | Créer lien partage 7j |
| DELETE | /api/share-links/{id} | Révoquer lien |
| DELETE | /api/account | Supprimer compte |
| POST | /api/payments/checkout | Créer session Stripe |

---

## Corrections Appliquées (PROMPT_EMERGENT.md)

1. ✅ Fix `delete_account` → utilise `storage.delete_file()`
2. ✅ Version API → `1.0.0`
3. ✅ Nettoyage `analysis_locks` → `finally: analysis_locks.pop()`
4. ✅ `aioboto3` ajouté aux requirements
5. ✅ `cra-template` retiré du package.json

---

## Prochaines Étapes (Post-V1)

### Phase 2 - Rangement Intelligent
- [ ] Filtres dynamiques (statut, type, date, mots-clés)
- [ ] Cartes stats cliquables
- [ ] Barre de recherche plein texte

### Phase 3 - Partage Avancé
- [ ] Partage granulaire (sélection de pièces)
- [ ] Liens avec mot de passe

### Phase 4 - Infrastructure
- [ ] Migration stockage vers S3/R2
- [ ] Codes promotionnels admin

---

*Dernière mise à jour: Décembre 2025*
