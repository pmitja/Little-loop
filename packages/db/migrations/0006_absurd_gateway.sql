CREATE TABLE "approved_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_profile_id" uuid NOT NULL,
	"provider" text DEFAULT 'youtube' NOT NULL,
	"channel_id" text NOT NULL,
	"channel_title" text NOT NULL,
	"uploads_playlist_id" text,
	"added_by_user_id" uuid NOT NULL,
	"last_pulled_at" timestamp with time zone,
	"last_published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"video_metadata_id" uuid NOT NULL,
	"approved_channel_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "video_metadata" ADD COLUMN "channel_id" text;--> statement-breakpoint
ALTER TABLE "approved_channels" ADD CONSTRAINT "approved_channels_child_profile_id_child_profiles_id_fk" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_channels" ADD CONSTRAINT "approved_channels_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_videos" ADD CONSTRAINT "pending_videos_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_videos" ADD CONSTRAINT "pending_videos_video_metadata_id_video_metadata_id_fk" FOREIGN KEY ("video_metadata_id") REFERENCES "public"."video_metadata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_videos" ADD CONSTRAINT "pending_videos_approved_channel_id_approved_channels_id_fk" FOREIGN KEY ("approved_channel_id") REFERENCES "public"."approved_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_approved_channel" ON "approved_channels" USING btree ("child_profile_id","provider","channel_id");--> statement-breakpoint
CREATE INDEX "idx_approved_channels_child" ON "approved_channels" USING btree ("child_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pending_video" ON "pending_videos" USING btree ("playlist_id","video_metadata_id");--> statement-breakpoint
CREATE INDEX "idx_pending_videos_playlist" ON "pending_videos" USING btree ("playlist_id");