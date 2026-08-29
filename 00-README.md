# Tarbiyah Sunnah Islamic Academy — Developer Documentation

Dokumentasi ini menjadi sumber kebenaran utama untuk pengembangan **Landing Page + LMS Tarbiyah Sunnah Islamic Academy (TIA)**.

## Prinsip Produk

> **Satu Caturwulan. Satu Fokus. Satu Tahap Tuntas.**

Tim akademik dapat melihat keseluruhan roadmap, tetapi peserta hanya perlu fokus pada caturwulan yang sedang dijalani.

## Stack

- React 19
- TypeScript
- Vite 8.x
- Refine Core 5.x (headless)
- React Router
- TanStack Query
- Tailwind CSS 4.3
- Radix UI primitives bila diperlukan
- Lucide Icons
- Hono API
- Zod
- Drizzle ORM
- Neon PostgreSQL
- Better Auth
- Hallmark design skill

## Struktur Dokumentasi

1. `01-PRODUCT-BRIEF.md`
2. `02-CURRICULUM.md`
3. `03-INFORMATION-ARCHITECTURE.md`
4. `04-UI-UX-DESIGN.md`
5. `05-LANDING-PAGE.md`
6. `06-STUDENT-LMS.md`
7. `07-ADMIN-PORTAL.md`
8. `08-DATABASE-SCHEMA.md`
9. `09-API-ARCHITECTURE.md`
10. `10-AUTH-RBAC.md`
11. `11-DESIGN-SYSTEM.md`
12. `12-HALLMARK-RULES.md`
13. `13-DEVELOPMENT-PLAN.md`
14. `14-AI-CODING-INSTRUCTIONS.md`
15. `15-ACCEPTANCE-CRITERIA.md`

## Golden Rules

- Jangan membuat UI seperti template SaaS generik.
- Jangan menampilkan perjalanan belajar panjang secara dominan kepada peserta.
- Progress utama selalu **per caturwulan**, bukan seluruh TIA.
- LMS selalu membantu menjawab: **Apa yang perlu saya kerjakan sekarang?**
- Landing page harus mengurangi persepsi bahwa TIA adalah program panjang dan melelahkan.
- Refine digunakan sebagai headless application/data layer, bukan sebagai template visual.
- Neon tidak boleh diakses langsung dari browser.
