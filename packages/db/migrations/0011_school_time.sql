ALTER TABLE "child_profiles" ADD COLUMN "school_time_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "school_start" text DEFAULT '8:00 AM' NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "school_end" text DEFAULT '3:00 PM' NOT NULL;