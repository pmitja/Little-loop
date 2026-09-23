CREATE TABLE "child_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"child_profile_id" uuid NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"install_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"paired_by_user_id" uuid,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "child_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "device_pairing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"secret_hash" text NOT NULL,
	"device_name" text NOT NULL,
	"platform" text NOT NULL,
	"install_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"child_device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_pairing_sessions_secret_hash_unique" UNIQUE("secret_hash")
);
--> statement-breakpoint
ALTER TABLE "watch_sessions" ADD COLUMN "child_device_id" uuid;--> statement-breakpoint
ALTER TABLE "child_devices" ADD CONSTRAINT "child_devices_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_devices" ADD CONSTRAINT "child_devices_child_profile_id_child_profiles_id_fk" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_devices" ADD CONSTRAINT "child_devices_paired_by_user_id_users_id_fk" FOREIGN KEY ("paired_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_pairing_sessions" ADD CONSTRAINT "device_pairing_sessions_child_device_id_child_devices_id_fk" FOREIGN KEY ("child_device_id") REFERENCES "public"."child_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_child_devices_family" ON "child_devices" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_child_devices_child" ON "child_devices" USING btree ("child_profile_id");--> statement-breakpoint
CREATE INDEX "idx_pairing_sessions_code" ON "device_pairing_sessions" USING btree ("code_hash");--> statement-breakpoint
ALTER TABLE "watch_sessions" ADD CONSTRAINT "watch_sessions_child_device_id_child_devices_id_fk" FOREIGN KEY ("child_device_id") REFERENCES "public"."child_devices"("id") ON DELETE set null ON UPDATE no action;