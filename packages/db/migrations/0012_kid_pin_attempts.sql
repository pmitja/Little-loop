ALTER TABLE "child_devices" ADD COLUMN "pin_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "child_devices" ADD COLUMN "pin_window_ends_at" timestamp with time zone;