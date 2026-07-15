ALTER TABLE "child_profiles" ADD COLUMN "weekend_bonus" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "bedtime_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "bedtime" text DEFAULT '7:30 PM' NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "warning_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "kid_proof_exit" boolean DEFAULT true NOT NULL;