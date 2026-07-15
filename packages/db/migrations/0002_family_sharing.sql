CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
CREATE TABLE "family_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_user_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Give every existing account its own family before moving child ownership.
INSERT INTO "families" ("id", "owner_user_id")
SELECT gen_random_uuid(), "id" FROM "users";
--> statement-breakpoint
INSERT INTO "family_members" ("family_id", "user_id", "role")
SELECT "id", "owner_user_id", 'owner' FROM "families";
--> statement-breakpoint
ALTER TABLE "child_profiles" ADD COLUMN "family_id" uuid;--> statement-breakpoint
UPDATE "child_profiles"
SET "family_id" = "families"."id"
FROM "families"
WHERE "families"."owner_user_id" = "child_profiles"."user_id";
--> statement-breakpoint
ALTER TABLE "child_profiles" ALTER COLUMN "family_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "child_profiles" DROP CONSTRAINT "child_profiles_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_child_profiles_user";--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_family_invites_family" ON "family_invites" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_family_member_user" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_family_member_family_user" ON "family_members" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_family_members_family" ON "family_members" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_child_profiles_family" ON "child_profiles" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "child_profiles" DROP COLUMN "user_id";
