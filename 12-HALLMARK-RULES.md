# Hallmark Rules

Hallmark digunakan sebagai **design discipline**, bukan component library.

## Required Workflow

1. Baca product brief.
2. Baca UI/UX dan design system.
3. Bangun halaman.
4. Jalankan Hallmark audit.
5. Perbaiki anti-pattern.
6. Audit kembali.

## Install

```bash
npx skills add nutlope/hallmark
```

## Prohibited Patterns

- gradient blob hero
- glowing background
- hero dashboard floating
- kartu seragam tiga kolom pada setiap section
- pills berlebihan
- radius terlalu besar
- pricing-style cards untuk kurikulum
- icon decoration tanpa fungsi
- stock illustration generik
- fake Arabic motif
- masjid/kubah/arch/bulan-bintang sebagai dekorasi otomatis

## Commands

```text
hallmark audit <target>
hallmark redesign <target>
hallmark study <screenshot|URL>
```
