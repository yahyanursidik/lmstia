CREATE TYPE "public"."attendance_channel" AS ENUM('daring', 'luring');--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "channel" "attendance_channel";--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "recorded_by" uuid;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Kanal hanya bermakna bagi yang hadir. Menyimpan "izin secara daring" adalah
-- catatan yang tidak punya arti dan menyesatkan saat direkap.
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_channel_chk" CHECK (
  ("status" = 'hadir') OR ("channel" IS NULL)
);
