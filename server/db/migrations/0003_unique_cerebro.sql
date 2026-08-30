CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
