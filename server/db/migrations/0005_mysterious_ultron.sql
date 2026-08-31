CREATE TYPE "public"."difficulty" AS ENUM('mudah', 'sedang', 'sulit');--> statement-breakpoint
CREATE TABLE "question_bank" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "question_type" DEFAULT 'multiple_choice' NOT NULL,
	"prompt" text NOT NULL,
	"options" text,
	"answer_key" text,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"topic" text,
	"tags" text,
	"difficulty" "difficulty" DEFAULT 'sedang' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD COLUMN "bank_question_id" uuid;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_bank_topic_idx" ON "question_bank" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "question_bank_type_idx" ON "question_bank" USING btree ("type");--> statement-breakpoint
-- Bentuk soal harus konsisten dengan tipenya. Kunci jawaban yang hilang pada
-- pilihan ganda berarti soal itu tidak mungkin dinilai otomatis, dan kunci
-- yang ada pada esai berarti sebaliknya — keduanya diam-diam merusak penilaian.
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_bentuk_chk" CHECK (
  (type = 'multiple_choice' AND options IS NOT NULL AND answer_key IS NOT NULL)
  OR (type = 'true_false' AND answer_key IN ('true','false'))
  OR (type = 'essay' AND answer_key IS NULL)
);--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_points_chk" CHECK (points > 0);
