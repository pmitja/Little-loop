import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy — LittleLoop',
  description: 'How LittleLoop collects, uses, and lets you delete your data.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="LittleLoop Privacy Policy" updated="July 15, 2026">
      <LegalSection heading="Who we are">
        <p>
          LittleLoop (&ldquo;we&rdquo;) is a parent-controlled video playlist app. Parents review
          and approve individual videos; children watch only that approved list in a locked child
          mode. Contact: <a href="mailto:support@littleloopapp.com">support@littleloopapp.com</a>.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>
          <strong>Parent account.</strong> Email address and authentication data, processed by our
          sign-in provider Clerk. Used only to sign you in and sync your content between your
          devices.
        </p>
        <p>
          <strong>Content you create.</strong> Child profile nickname, avatar choice, age range,
          and time-limit setting; the list of approved video links (video ID, title, channel name,
          duration, thumbnail URL as provided by YouTube). Child profiles do not require a real
          name.
        </p>
        <p>
          <strong>Subscription status.</strong> Whether your account has an active LittleLoop
          Premium subscription, processed by RevenueCat and the Apple App Store / Google Play. We
          never see your payment details.
        </p>
        <p>
          <strong>Family sharing.</strong> When the main caregiver invites another caregiver,
          family members can see each other&rsquo;s account email and access the shared child
          profiles, settings, approved playlists, and watch activity. Invitation links expire
          after seven days and can be revoked by the main caregiver.
        </p>
        <p>
          <strong>Crash reports.</strong> Technical crash data via Sentry: device model, OS
          version, and stack traces. We configure Sentry to send no personally identifying
          information, no child names, and no video titles.
        </p>
      </LegalSection>

      <LegalSection heading="What never leaves the device">
        <ul>
          <li>
            <strong>Parent PIN</strong> — stored only as a salted hash in the device
            Keychain/Keystore. It is never transmitted, logged, or recoverable by us.
          </li>
          <li>
            <strong>Watch activity on the free plan</strong> — sessions, daily totals, and
            most-watched statistics are stored only on the device and are deleted with the app.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Children's privacy">
        <p>
          LittleLoop is operated for and by parents. Child mode collects no personal information
          from children: there is no search, no browsing, no comments, no account for the child,
          and no advertising of our own. Video playback uses YouTube&rsquo;s privacy-enhanced
          embedded player (youtube-nocookie.com). Videos may include ads served by the video
          platform; we have no control over and receive no data from them. We do not knowingly
          collect personal information from children under 13; the only child-related data we
          store is the nickname, avatar, and settings a parent chooses to enter.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party processors">
        <table className="legal-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Purpose</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clerk</td>
              <td>Parent sign-in</td>
              <td>Email, auth tokens</td>
            </tr>
            <tr>
              <td>RevenueCat</td>
              <td>Subscription management</td>
              <td>Store receipt, anonymized user id</td>
            </tr>
            <tr>
              <td>Sentry</td>
              <td>Crash reporting</td>
              <td>Device/OS info, stack traces</td>
            </tr>
            <tr>
              <td>YouTube (Google)</td>
              <td>Video playback, metadata, thumbnails</td>
              <td>Video requests from the device</td>
            </tr>
          </tbody>
        </table>
        <p>
          We do not sell personal data, do not run third-party advertising, and do not use
          cross-app tracking.
        </p>
      </LegalSection>

      <LegalSection id="deletion" heading="Data retention & deletion">
        <p>
          Account data is retained while your account exists. For the main caregiver,
          <strong> Settings → Delete account &amp; data</strong> removes the entire family. For an
          invited caregiver, it removes only their account and family access. You can also
          request deletion at{' '}
          <a href="/delete-account">littleloopapp.com/delete-account</a> or by emailing{' '}
          <a href="mailto:support@littleloopapp.com">support@littleloopapp.com</a>; we complete requests
          within 30 days.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We will update this page and the &ldquo;last updated&rdquo; date for material changes,
          and note them in release notes.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
