CREATE TYPE "public"."assessment_kind" AS ENUM('kuis', 'ujian', 'latihan');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('hadir', 'izin', 'sakit', 'alpa');--> statement-breakpoint
CREATE TYPE "public"."competency_status" AS ENUM('sudah_dikuasai', 'perlu_murojaah', 'belum_dikuasai');--> statement-breakpoint
CREATE TYPE "public"."engagement_status" AS ENUM('on_track', 'needs_attention', 'at_risk', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('registered', 'approved', 'active', 'completed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('pdf', 'audio', 'video', 'youtube', 'gdrive', 'article', 'link');--> statement-breakpoint
CREATE TYPE "public"."meeting_mode" AS ENUM('online', 'offline', 'hybrid', 'mandiri');--> statement-breakpoint
CREATE TYPE "public"."meeting_type" AS ENUM('ORIENTATION', 'REGULAR', 'REVIEW', 'ASSESSMENT', 'BREAK');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('not_started', 'in_progress', 'completed', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'instructor', 'academic_admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."subject_role" AS ENUM('INTENSIVE', 'FOUNDATION', 'COMPANION');--> statement-breakpoint
CREATE TYPE "public"."tahapan_status" AS ENUM('draft', 'open', 'running', 'closed');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tahapan_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text DEFAULT 'Semua' NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"options" text,
	"answer" text,
	"explanation" text,
	"sequence" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"kind" "assessment_kind" DEFAULT 'kuis' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"question_count" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"passing_score" integer,
	"weight" integer,
	"max_attempts" integer DEFAULT 0 NOT NULL,
	"publish_status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "attendance_status" DEFAULT 'alpa' NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_material_id_pk" PRIMARY KEY("user_id","material_id")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tahapan_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'registered' NOT NULL,
	"engagement" "engagement_status" DEFAULT 'on_track' NOT NULL,
	"competency" "competency_status",
	"class_name" text,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"progress" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"response" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "material_type" NOT NULL,
	"url" text,
	"content" text,
	"thumbnail_url" text,
	"file_size_kb" integer,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"sequence" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_essential" boolean DEFAULT false NOT NULL,
	"publish_status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"objectives" text,
	"type" "meeting_type" DEFAULT 'REGULAR' NOT NULL,
	"mode" "meeting_mode" DEFAULT 'mandiri' NOT NULL,
	"live_url" text,
	"live_platform" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"location" text,
	"map_url" text,
	"recording_url" text,
	"attendance_enabled" boolean DEFAULT false NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"sequence" integer NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"publish_status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"material_id" uuid,
	"body" text NOT NULL,
	"is_private" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "program_status" DEFAULT 'draft' NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tahapan_id" uuid NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"role" "subject_role" DEFAULT 'FOUNDATION' NOT NULL,
	"delivery_model" text,
	"weekly_load" text,
	"instructor_id" uuid,
	"sequence" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tahapan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"subtitle" text,
	"description" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"registration_start" timestamp with time zone,
	"registration_end" timestamp with time zone,
	"duration_weeks" integer DEFAULT 12 NOT NULL,
	"status" "tahapan_status" DEFAULT 'draft' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"password_hash" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"segment" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tahapan_id_tahapan_id_fk" FOREIGN KEY ("tahapan_id") REFERENCES "public"."tahapan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_tahapan_id_tahapan_id_fk" FOREIGN KEY ("tahapan_id") REFERENCES "public"."tahapan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_progress" ADD CONSTRAINT "material_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_progress" ADD CONSTRAINT "material_progress_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_tahapan_id_tahapan_id_fk" FOREIGN KEY ("tahapan_id") REFERENCES "public"."tahapan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahapan" ADD CONSTRAINT "tahapan_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_questions_seq_idx" ON "assessment_questions" USING btree ("assessment_id","sequence");--> statement-breakpoint
CREATE INDEX "assessments_meeting_idx" ON "assessments" USING btree ("meeting_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_meeting_user_idx" ON "attendance" USING btree ("meeting_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_idx" ON "auth_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_user_tahapan_idx" ON "enrollments" USING btree ("user_id","tahapan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "material_progress_user_material_idx" ON "material_progress" USING btree ("user_id","material_id");--> statement-breakpoint
CREATE INDEX "materials_meeting_seq_idx" ON "materials" USING btree ("meeting_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "meetings_subject_number_idx" ON "meetings" USING btree ("subject_id","number");--> statement-breakpoint
CREATE INDEX "meetings_subject_seq_idx" ON "meetings" USING btree ("subject_id","sequence");--> statement-breakpoint
CREATE INDEX "meetings_starts_at_idx" ON "meetings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programs_slug_idx" ON "programs" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_slug_idx" ON "subjects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subjects_tahapan_seq_idx" ON "subjects" USING btree ("tahapan_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "tahapan_slug_idx" ON "tahapan" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tahapan_program_seq_idx" ON "tahapan" USING btree ("program_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");