# Skill proyek

Skill adalah berkas instruksi yang dimuat Claude Code saat tugasnya cocok.
Isi folder ini tersedia bagi siapa pun yang membuka repo ini — tidak perlu
dipasang satu per satu di tiap mesin.

## Asal

Seluruhnya disalin apa adanya dari [anthropics/skills](https://github.com/anthropics/skills),
Apache 2.0. Setiap folder membawa `LICENSE.txt`-nya sendiri; jangan dibuang.

| Skill | Kegunaan di sini |
|---|---|
| `webapp-testing` | Menjalankan dan memeriksa aplikasi di peramban lewat Playwright |
| `frontend-design` | Pedoman mengerjakan antarmuka |
| `brand-guidelines` | Menjaga identitas visual tetap konsisten |
| `theme-factory` | Menyusun dan mengubah tema warna |
| `skill-creator` | Menulis skill baru khusus TIA |
| `docx` `pdf` `pptx` `xlsx` | Membuat dan membaca berkas dokumen — rapor, sertifikat, rekap peserta |

## Yang sengaja tidak dipasang

Repo asalnya berisi 19 skill, 13 MB. Yang berikut dilewati karena tidak
dipakai pekerjaan di sini, dan beberapa di antaranya berukuran besar:

`canvas-design` (5,7 MB), `claude-api` (2,3 MB), `mcp-builder`,
`algorithmic-art`, `slack-gif-creator`, `internal-comms`, `doc-coauthoring`,
`academy-guide`, `discernment-nudge`, `web-artifacts-builder`.

Menambahkan salah satunya cukup menyalin foldernya ke sini:

```bash
git clone --depth 1 https://github.com/anthropics/skills.git /tmp/anthropic-skills && cp -r /tmp/anthropic-skills/skills/<nama> .claude/skills/<nama>
```

## Memperbarui

Skill ini salinan, bukan submodule — sengaja, supaya `git clone` repo ini
langsung membawa semuanya tanpa langkah tambahan. Konsekuensinya pembaruan
tidak datang sendiri: salin ulang foldernya dengan perintah di atas ketika
ingin versi terbaru.
