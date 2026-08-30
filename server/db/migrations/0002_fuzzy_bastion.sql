CREATE TYPE "public"."form_status" AS ENUM('draf', 'terbit', 'ditutup');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('ikhwan', 'akhwat');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('menunggu', 'disetujui', 'ditolak');--> statement-breakpoint
CREATE TABLE "registration_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"headline" text,
	"description" text,
	"commitment_text" text DEFAULT 'Saya berniat bersungguh-sungguh dan istiqomah mengikuti program ini sampai selesai, in syaa Allah.' NOT NULL,
	"wa_ikhwan_url" text,
	"wa_akhwat_url" text,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"status" "form_status" DEFAULT 'draf' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"gender" "gender" NOT NULL,
	"country" text,
	"province" text,
	"city" text,
	"education" "education_level",
	"segment" text,
	"reason" text,
	"commitment_agreed" boolean DEFAULT false NOT NULL,
	"commitment_snapshot" text,
	"status" "registration_status" DEFAULT 'menunggu' NOT NULL,
	"note" text,
	"user_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_form_id_registration_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."registration_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registration_forms_slug_idx" ON "registration_forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "registration_forms_program_idx" ON "registration_forms" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_form_email_idx" ON "registrations" USING btree ("form_id","email");--> statement-breakpoint
CREATE INDEX "registrations_status_idx" ON "registrations" USING btree ("status");--> statement-breakpoint
-- Persetujuan istiqomah adalah syarat, bukan pilihan: baris tanpa persetujuan
-- tidak boleh ada sama sekali, sekalipun ada jalur kode yang lalai memeriksa.
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_commitment_chk" CHECK ("commitment_agreed" = true);--> statement-breakpoint
-- Rentang waktu pendaftaran harus masuk akal bila keduanya diisi.
ALTER TABLE "registration_forms" ADD CONSTRAINT "registration_forms_window_chk" CHECK ("opens_at" IS NULL OR "closes_at" IS NULL OR "closes_at" > "opens_at");
