CREATE TYPE "public"."account_status" AS ENUM('aktif', 'nonaktif', 'ditangguhkan');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('sd', 'smp', 'sma', 'd1_d3', 'd4_s1', 's2', 's3', 'lainnya');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "education" "education_level";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "account_status" DEFAULT 'aktif' NOT NULL;