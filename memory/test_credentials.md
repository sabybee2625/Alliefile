# Test Credentials

## Test Users (existants)
- **Email**: ui_test_1776936593@test.com
- **Password**: UITest123!

## Test Users (créés pendant iteration_7 testing)
- **Pattern**: ui_alliefile2_<timestamp>@test.com / `TestPass123!`
- **Pattern**: TEST_alliefile_<timestamp>@test.com / `TestPass123!`

## Beta Access
- **Code Beta**: ASSO100 (passe un compte Free en Premium/Pro)

## API
- `POST /api/auth/register` avec `{name, email, password}` → retourne `access_token` et envoie email bienvenue (si RESEND_API_KEY)
- `POST /api/auth/login` → `access_token`
- `GET /api/payments/plans` → plans Essentiel (standard) + Pro (premium)

## Plans (compat)
- Clés internes DB : `free` / `standard` / `premium`
- Slugs publics acceptés : `free` / `essentiel` / `pro`
