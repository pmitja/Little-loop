import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  revenuecatAppUserId: text('revenuecat_app_user_id').unique(),
  ...timestamps,
});

/** One shared household. Exactly one member is the administrative/billing owner. */
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...timestamps,
});

export const familyMembers = pgTable(
  'family_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'caregiver'] }).notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_family_member_user').on(t.userId),
    uniqueIndex('uq_family_member_family_user').on(t.familyId, t.userId),
    index('idx_family_members_family').on(t.familyId),
  ],
);

export const familyInvites = pgTable(
  'family_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    invitedByUserId: uuid('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('idx_family_invites_family').on(t.familyId)],
);

export const childProfiles = pgTable(
  'child_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    // Nickname only — no PII, no birthdate (PLAN §16).
    nickname: text('nickname').notNull(),
    ageRange: text('age_range', { enum: ['2-4', '5-7', '8-10'] }).notNull(),
    avatar: text('avatar').notNull().default('bear'),
    dailyLimitMinutes: integer('daily_limit_minutes'), // null = no limit
    weekendBonus: boolean('weekend_bonus').notNull().default(true),
    bedtimeEnabled: boolean('bedtime_enabled').notNull().default(true),
    bedtime: text('bedtime').notNull().default('7:30 PM'),
    warningEnabled: boolean('warning_enabled').notNull().default(true),
    kidProofExit: boolean('kid_proof_exit').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('idx_child_profiles_family').on(t.familyId)],
);

export const playlists = pgTable(
  'playlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childProfileId: uuid('child_profile_id')
      .notNull()
      .references(() => childProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('My playlist'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('idx_playlists_child').on(t.childProfileId)],
);

// Global cache of provider metadata — one row per video across all users.
export const videoMetadata = pgTable(
  'video_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull().default('youtube'),
    providerVideoId: text('provider_video_id').notNull(),
    title: text('title').notNull(),
    channelTitle: text('channel_title').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    embeddable: boolean('embeddable').notNull().default(true),
    madeForKids: boolean('made_for_kids'),
    status: text('status', { enum: ['available', 'unavailable'] })
      .notNull()
      .default('available'),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex('uq_video_provider').on(t.provider, t.providerVideoId)],
);

// Shared cache of search results — one row per normalized query across all
// users. search.list costs 100 quota units, so cache hits are what make the
// feature viable at scale.
export const searchCache = pgTable(
  'search_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull().default('youtube'),
    query: text('query').notNull(),
    results: jsonb('results')
      .$type<
        {
          providerVideoId: string;
          title: string;
          channelTitle: string;
          durationSeconds: number;
          thumbnailUrl: string;
        }[]
      >()
      .notNull()
      .default([]),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex('uq_search_cache_query').on(t.provider, t.query)],
);

export const playlistVideos = pgTable(
  'playlist_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    videoMetadataId: uuid('video_metadata_id')
      .notNull()
      .references(() => videoMetadata.id),
    position: integer('position').notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
    approvedByUserId: uuid('approved_by_user_id')
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_playlist_video').on(t.playlistId, t.videoMetadataId),
    index('idx_playlist_videos_playlist_pos').on(t.playlistId, t.position),
  ],
);

export const parentSettings = pgTable('parent_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  pinSet: boolean('pin_set').notNull().default(false), // flag only; hash lives on-device
  pinRecoveryHash: text('pin_recovery_hash'), // client-side hash for email-verified reset (PLAN §11)
  biometricEnabled: boolean('biometric_enabled').notNull().default(false),
  ...timestamps,
});

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    installId: text('install_id').notNull(), // random uuid from the app install
    platform: text('platform', { enum: ['ios', 'android'] }).notNull(),
    appVersion: text('app_version'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [uniqueIndex('uq_device_install').on(t.userId, t.installId)],
);

export const watchSessions = pgTable(
  'watch_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientSessionId: text('client_session_id').unique(),
    childProfileId: uuid('child_profile_id')
      .notNull()
      .references(() => childProfiles.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id').references(() => devices.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    totalSeconds: integer('total_seconds').notNull().default(0),
    videosWatched: jsonb('videos_watched')
      .$type<{ videoMetadataId: string; seconds: number }[]>()
      .notNull()
      .default([]),
    endReason: text('end_reason', {
      enum: ['parent_exit', 'time_limit', 'app_closed', 'unknown'],
    }),
    ...timestamps,
  },
  (t) => [index('idx_sessions_child_started').on(t.childProfileId, t.startedAt)],
);

export const subscriptionStatus = pgTable('subscription_status', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  isPremium: boolean('is_premium').notNull().default(false),
  productId: text('product_id'),
  store: text('store', { enum: ['app_store', 'play_store', 'promo'] }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  lastEventType: text('last_event_type'),
  lastEventAt: timestamp('last_event_at', { withTimezone: true }),
  ...timestamps,
});

export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    deviceId: uuid('device_id'),
    type: text('type', {
      enum: [
        'pin_failed',
        'pin_lockout',
        'pin_reset',
        'child_mode_enter',
        'child_mode_exit',
        'video_approved',
        'video_removed',
      ],
    }).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_security_events_user_time').on(t.userId, t.createdAt)],
);

// Relations for Drizzle's relational query API (db.query.*.findMany({ with })).
export const playlistVideosRelations = relations(playlistVideos, ({ one }) => ({
  video: one(videoMetadata, {
    fields: [playlistVideos.videoMetadataId],
    references: [videoMetadata.id],
  }),
  playlist: one(playlists, {
    fields: [playlistVideos.playlistId],
    references: [playlists.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  childProfile: one(childProfiles, {
    fields: [playlists.childProfileId],
    references: [childProfiles.id],
  }),
  videos: many(playlistVideos),
}));

export const childProfilesRelations = relations(childProfiles, ({ one, many }) => ({
  family: one(families, { fields: [childProfiles.familyId], references: [families.id] }),
  playlists: many(playlists),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  owner: one(users, { fields: [families.ownerUserId], references: [users.id] }),
  members: many(familyMembers),
  children: many(childProfiles),
  invites: many(familyInvites),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, { fields: [familyMembers.familyId], references: [families.id] }),
  user: one(users, { fields: [familyMembers.userId], references: [users.id] }),
}));

export const familyInvitesRelations = relations(familyInvites, ({ one }) => ({
  family: one(families, { fields: [familyInvites.familyId], references: [families.id] }),
  invitedBy: one(users, {
    fields: [familyInvites.invitedByUserId],
    references: [users.id],
    relationName: 'familyInviteCreator',
  }),
  acceptedBy: one(users, {
    fields: [familyInvites.acceptedByUserId],
    references: [users.id],
    relationName: 'familyInviteAcceptor',
  }),
}));
