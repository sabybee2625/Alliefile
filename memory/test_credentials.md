# Test Credentials

## Admin (config ADMIN_EMAILS en preview)
- **Email**: `admin_test_1777718525@test.com`
- **Password**: `AdminTest123!`
- **Note**: Accès à `/admin`. Pour ajouter un autre admin en prod, modifier `ADMIN_EMAILS` dans `/app/backend/.env` (comma-separated).

## Test Users existants
- **Email**: `ui_test_1776936593@test.com`
- **Password**: `UITest123!`

## Patterns créés par testing agents
- `pytest_<ts>_<hash>@test.com` / `PytestPass123!` (tests pytest)
- `ui_alliefile2_<ts>@test.com` / `TestPass123!` (iteration_7)
- `TEST_alliefile_<ts>@test.com` / `TestPass123!` (iteration_7)

## Beta Access
- **Code Beta**: `ASSO100` (passe un compte Free en Premium/Pro)

## Stripe Test Mode (preview)
- **Secret**: `sk_test_51TSahk...` (configuré dans `/app/backend/.env`)
- **Publishable**: `pk_test_51TSahk...` (exposable)
- **Webhook secret**: à configurer depuis le Dashboard Stripe après déploiement prod

## API
- `POST /api/auth/register` `{name, email, password}` → `access_token`
- `POST /api/auth/login` → `access_token`
- `GET /api/admin/me` (admin seulement) → vérifier accès
- `GET /api/admin/stats` → métriques globales
- Tests pytest : `cd /app/backend && python -m pytest tests/test_smoke.py -v`

## Plans (compat)
- Clés internes DB : `free` / `standard` / `premium`
- Slugs publics acceptés : `free` / `essentiel` / `pro`
