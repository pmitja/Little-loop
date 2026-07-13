# LittleLoop Privacy Policy

_Last updated: July 8, 2026. This is the canonical copy; the in-app version
(`apps/mobile/src/app/(parent)/legal.tsx`) is a condensed rendering and must be
kept in sync. Host this document at https://littleloopapp.com/privacy for the
store listings._

## Who we are

LittleLoop ("we") is a parent-controlled video playlist app. Parents review and
approve individual videos; children watch only that approved list in a locked
child mode. Contact: privacy@littleloopapp.com.

## What we collect

**Parent account.** Email address and authentication data, processed by our
sign-in provider Clerk. Used only to sign you in and sync your content between
your devices.

**Content you create.** Child profile nickname, avatar choice, age range, and
time-limit setting; the list of approved video links (video ID, title, channel
name, duration, thumbnail URL as provided by YouTube). Child profiles do not
require a real name.

**Subscription status.** Whether your account has an active LittleLoop Premium
subscription, processed by RevenueCat and the Apple App Store / Google Play.
We never see your payment details.

**Crash reports.** Technical crash data via Sentry: device model, OS version,
and stack traces. We configure Sentry to send no personally identifying
information, no child names, and no video titles.

## What never leaves the device

- **Parent PIN** — stored only as a salted hash in the device
  Keychain/Keystore. It is never transmitted, logged, or recoverable by us.
- **Watch activity on the free plan** — sessions, daily totals, and
  most-watched statistics are stored only on the device and are deleted with
  the app.

## Children's privacy

LittleLoop is operated for and by parents. Child mode collects no personal
information from children: there is no search, no browsing, no comments, no
account for the child, and no advertising of our own. Video playback uses
YouTube's privacy-enhanced embedded player (youtube-nocookie.com). Videos may
include ads served by the video platform; we have no control over and receive
no data from them. We do not knowingly collect personal information from
children under 13; the only child-related data we store is the nickname,
avatar, and settings a parent chooses to enter.

## Third-party processors

| Service | Purpose | Data |
|---|---|---|
| Clerk | Parent sign-in | Email, auth tokens |
| RevenueCat | Subscription management | Store receipt, anonymized user id |
| Sentry | Crash reporting | Device/OS info, stack traces |
| YouTube (Google) | Video playback, metadata, thumbnails | Video requests from the device |

We do not sell personal data, do not run third-party advertising, and do not
use cross-app tracking.

## Data retention & deletion

Account data is retained while your account exists. **Settings → Delete
account & data** in the app removes all local data and your account. You can
also request deletion at privacy@littleloopapp.com; we complete requests within
30 days.

## Changes

We will update this page and the "last updated" date for material changes, and
note them in release notes.
