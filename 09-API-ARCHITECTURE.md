# API Architecture

## Stack

- Hono
- TypeScript
- Zod
- Drizzle ORM
- Neon PostgreSQL

## Architecture

```text
React
  ↓
TIA API
  ↓
Service Layer
  ↓
Repository
  ↓
Drizzle
  ↓
Neon PostgreSQL
```

Frontend tidak boleh mengakses Neon langsung.

## Base Route

`/api/v1`

## Student

```text
GET  /me
GET  /me/dashboard
GET  /me/progress
GET  /me/next-learning-action
GET  /me/bookmarks
POST /me/bookmarks
DELETE /me/bookmarks/:id
```

## Terms

```text
GET /terms
GET /terms/:id
GET /terms/:id/courses
```

## Lessons

```text
GET  /lessons/:id
POST /lessons/:id/start
POST /lessons/:id/complete
```

## Sessions

```text
GET /sessions
GET /sessions/:id
```

## Admin

`/api/v1/admin/*`

## Code Structure

```text
src/
├── routes/
├── services/
├── repositories/
├── middleware/
├── validators/
├── auth/
└── lib/
```

Semua mutation harus divalidasi dengan Zod dan authorization diverifikasi server-side.
