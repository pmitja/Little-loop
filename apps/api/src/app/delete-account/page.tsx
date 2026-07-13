import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Delete Your Account — LittleLoop',
  description: 'How to delete your LittleLoop account and data, in-app or by email.',
};

export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your LittleLoop account" updated="July 8, 2026">
      <LegalSection heading="Delete in the app (fastest)">
        <p>
          Open LittleLoop, go to <strong>Settings → Delete account &amp; data</strong>, and confirm
          twice. This immediately:
        </p>
        <ul>
          <li>Deletes your parent account and sign-in credentials.</li>
          <li>
            Deletes all child profiles, playlists, and approved videos associated with your
            account.
          </li>
          <li>
            Clears everything stored only on the device: your Parent PIN and, on the free plan,
            local watch history.
          </li>
          <li>Signs you out.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Request deletion without the app">
        <p>
          If you no longer have the app installed or can&rsquo;t sign in, email{' '}
          <a href="mailto:privacy@littleloopapp.com">privacy@littleloopapp.com</a> from the address
          registered to your account and ask us to delete it. We complete these requests within 30
          days and will confirm by email once it&rsquo;s done.
        </p>
      </LegalSection>

      <LegalSection heading="What isn't deleted automatically">
        <p>
          Your LittleLoop Premium subscription is billed by the Apple App Store or Google Play, not
          by us — deleting your LittleLoop account does not cancel it. Cancel from your{' '}
          <a
            href="https://support.apple.com/en-us/HT202039"
            target="_blank"
            rel="noreferrer"
          >
            Apple ID subscriptions
          </a>{' '}
          or{' '}
          <a
            href="https://play.google.com/store/account/subscriptions"
            target="_blank"
            rel="noreferrer"
          >
            Google Play subscriptions
          </a>{' '}
          settings to stop future billing.
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          See our <a href="/privacy">Privacy Policy</a> for what we collect, or email{' '}
          <a href="mailto:privacy@littleloopapp.com">privacy@littleloopapp.com</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
