# Authentication & RBAC

## Authentication

Gunakan Better Auth atau integrasi auth yang kompatibel dengan Neon.

## Roles

- student
- instructor
- academic_admin
- super_admin

## Student

Boleh melihat kelas yang diikuti, mengirim worksheet, mengikuti quiz, melihat progress sendiri, menyimpan murojaah, dan mengelola catatan sendiri.

## Instructor

Boleh melihat kelas yang diampu, peserta kelas, kehadiran, submission yang ditugaskan, dan memberi feedback.

## Academic Admin

Boleh mengelola caturwulan, course, curriculum, peserta, pengajar, session, attendance, quiz, worksheet, dan announcement.

## Super Admin

Akses penuh.

## Security

- Jangan kirim credential database ke browser.
- Jangan percaya role dari localStorage.
- Authorization final di backend.
- Audit mutation sensitif.
- Rate limit endpoint auth dan publik penting.
