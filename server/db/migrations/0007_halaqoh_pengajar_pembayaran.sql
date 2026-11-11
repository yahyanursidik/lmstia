CREATE TYPE "public"."halaqoh_status" AS ENUM('draft', 'aktif', 'selesai');--> statement-breakpoint
CREATE TYPE "public"."material_scope" AS ENUM('pertemuan', 'umum');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('belum_bayar', 'menunggu_verifikasi', 'lunas', 'dibebaskan', 'ditolak');--> statement-breakpoint
CREATE TABLE "halaqoh" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tahapan_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"gender" "gender",
	"instructor_id" uuid,
	"capacity" integer,
	"day_of_week" integer,
	"start_time" text,
	"end_time" text,
	"mode" "meeting_mode" DEFAULT 'online' NOT NULL,
	"location" text,
	"live_url" text,
	"wa_group_url" text,
	"note" text,
	"status" "halaqoh_status" DEFAULT 'draft' NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage" text DEFAULT 'postgres' NOT NULL,
	"data_base64" text,
	"object_key" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teaching_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"halaqoh_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"instructor_id" uuid NOT NULL,
	"day_of_week" integer,
	"start_time" text,
	"end_time" text,
	"mode" "meeting_mode" DEFAULT 'online' NOT NULL,
	"location" text,
	"live_url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materials" ALTER COLUMN "meeting_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "halaqoh_id" uuid;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "scope" "material_scope" DEFAULT 'pertemuan' NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "fee_amount" integer;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "bank_account_number" text;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "bank_account_holder" text;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "payment_note" text;--> statement-breakpoint
ALTER TABLE "registration_forms" ADD COLUMN "payment_due_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "payment_status" "payment_status" DEFAULT 'belum_bayar' NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "fee_amount" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "payment_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "payment_verified_by" uuid;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "payment_note" text;--> statement-breakpoint
ALTER TABLE "halaqoh" ADD CONSTRAINT "halaqoh_tahapan_id_tahapan_id_fk" FOREIGN KEY ("tahapan_id") REFERENCES "public"."tahapan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "halaqoh" ADD CONSTRAINT "halaqoh_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_halaqoh_id_halaqoh_id_fk" FOREIGN KEY ("halaqoh_id") REFERENCES "public"."halaqoh"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "halaqoh_tahapan_code_idx" ON "halaqoh" USING btree ("tahapan_id","code");--> statement-breakpoint
CREATE INDEX "halaqoh_tahapan_seq_idx" ON "halaqoh" USING btree ("tahapan_id","sequence");--> statement-breakpoint
CREATE INDEX "halaqoh_instructor_idx" ON "halaqoh" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "payment_proofs_registration_idx" ON "payment_proofs" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teaching_halaqoh_subject_idx" ON "teaching_assignments" USING btree ("halaqoh_id","subject_id");--> statement-breakpoint
CREATE INDEX "teaching_instructor_idx" ON "teaching_assignments" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "teaching_subject_idx" ON "teaching_assignments" USING btree ("subject_id");--> statement-breakpoint
-- Kunci asing yang tidak ikut dibangkitkan: `enrollments.halaqoh_id` sengaja
-- tidak memakai .references() di skema karena `halaqoh` didefinisikan setelah
-- `enrollments`, dan menautkannya langsung membuat lingkaran impor. Batasannya
-- tetap harus ada di basis data.
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_halaqoh_id_fk" FOREIGN KEY ("halaqoh_id") REFERENCES "public"."halaqoh"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollments_halaqoh_idx" ON "enrollments" USING btree ("halaqoh_id");--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_payment_verified_by_fk" FOREIGN KEY ("payment_verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Materi: `scope` dan `meeting_id` harus sebaris. Materi pertemuan wajib
-- menyebut pertemuannya; materi umum justru tidak boleh menyebut satu pun,
-- karena ia milik semua program.
ALTER TABLE "materials" ADD CONSTRAINT "materials_scope_chk" CHECK (
  ("scope" = 'pertemuan' AND "meeting_id" IS NOT NULL)
  OR ("scope" = 'umum' AND "meeting_id" IS NULL)
);--> statement-breakpoint

-- Bukti transfer: kolom yang terisi harus cocok dengan lapis penyimpanannya.
-- Tanpa ini, baris bisa mengaku tersimpan di objek sementara kuncinya kosong.
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_storage_chk" CHECK (
  ("storage" = 'postgres' AND "data_base64" IS NOT NULL AND "object_key" IS NULL)
  OR ("storage" = 'objek' AND "object_key" IS NOT NULL AND "data_base64" IS NULL)
);--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_size_chk" CHECK ("size_bytes" > 0);--> statement-breakpoint

-- Halaqoh: hari 1..7 (Senin..Ahad) dan daya tampung yang masuk akal.
ALTER TABLE "halaqoh" ADD CONSTRAINT "halaqoh_day_chk" CHECK ("day_of_week" IS NULL OR ("day_of_week" BETWEEN 1 AND 7));--> statement-breakpoint
ALTER TABLE "halaqoh" ADD CONSTRAINT "halaqoh_capacity_chk" CHECK ("capacity" IS NULL OR "capacity" > 0);--> statement-breakpoint
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_day_chk" CHECK ("day_of_week" IS NULL OR ("day_of_week" BETWEEN 1 AND 7));--> statement-breakpoint

-- Formulir berbayar wajib menyebut biaya dan rekening tujuannya. Tanpa ini,
-- pendaftar sampai di langkah pembayaran dan menemukan halaman kosong.
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_payment_chk" CHECK (
  "is_paid" = false
  OR ("fee_amount" IS NOT NULL AND "fee_amount" > 0
      AND "bank_name" IS NOT NULL AND "bank_account_number" IS NOT NULL
      AND "bank_account_holder" IS NOT NULL)
);--> statement-breakpoint
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_due_chk" CHECK ("payment_due_days" > 0);
