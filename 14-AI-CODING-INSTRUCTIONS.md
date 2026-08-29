# AI Coding Instructions

## Jangan Bangun Semua Sekaligus

Kerjakan per fase. Setelah setiap fase:
- typecheck;
- lint;
- test;
- review UI;
- pastikan tidak merusak fase sebelumnya.

## Source of Truth

1. `00-README.md`
2. `01-PRODUCT-BRIEF.md`
3. dokumen domain terkait
4. existing code
5. asumsi AI

## Stack Constraints

Wajib:
- React
- TypeScript
- Vite 8.x
- Refine Core headless
- Tailwind CSS 4.3
- Hono
- Zod
- Drizzle
- Neon PostgreSQL

## UI Constraints

- custom UI
- Hallmark principles
- no generic admin template
- no excessive gradients
- no oversized rounded cards
- no Islamic cliché decoration
- mobile-first

## Domain Constraints

- Progress utama = per caturwulan.
- Enrollment = per caturwulan.
- Jangan auto-enroll seluruh jenjang.

## Database

- migration first
- foreign keys
- indexes
- timestamps

## API

- Zod validation
- consistent errors
- server-side authorization
- service layer

## Refine

Gunakan untuk resources, data provider, mutations, query, dan access control. Jangan gunakan template visual Refine sebagai final UI.

## Before Completing Phase

- build pass
- no TS errors
- responsive
- loading state
- empty state
- error state
- permission check
- Hallmark audit untuk halaman visual penting
