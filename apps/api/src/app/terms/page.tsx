import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use — LittleLoop',
  description: 'The terms that govern your use of LittleLoop, including subscriptions.',
};

export default function TermsOfUsePage() {
  return (
    <LegalPage title="LittleLoop Terms of Use" updated="July 22, 2026">
      <LegalSection heading="The service">
        <p>
          LittleLoop lets parents build playlists of videos they have personally reviewed and hand
          the phone to a child in a locked mode. You are responsible for reviewing each video
          before approving it. By using LittleLoop you agree to these Terms of Use.
        </p>
      </LegalSection>

      <LegalSection heading="Video content">
        <p>
          Videos play through the official YouTube embedded player and remain subject to
          YouTube&rsquo;s terms. They may include ads served by the video platform. YouTube is a
          trademark of Google LLC; LittleLoop is not affiliated with or endorsed by Google.
        </p>
      </LegalSection>

      <LegalSection heading="Subscriptions">
        <p>
          LittleLoop Premium is an auto-renewable subscription offered monthly and yearly. Payment
          is charged to your Apple App Store or Google Play account at confirmation of purchase.
        </p>
        <p>
          The subscription renews automatically unless auto-renew is turned off at least 24 hours
          before the end of the current period. Your account is charged for renewal within 24 hours
          before the end of the current period. You can manage or cancel your subscription in your
          App Store or Google Play account settings after purchase.
        </p>
        <p>
          The free plan includes 1 child profile, 1 playlist, and a limited number of approved
          videos. Current prices are shown in the app before you purchase.
        </p>
      </LegalSection>

      <LegalSection heading="Limits of the lock">
        <p>
          Child mode locks LittleLoop itself. It cannot lock the rest of the phone — for that, use
          iOS Guided Access or Android app pinning as suggested in the app. LittleLoop is provided
          &ldquo;as is,&rdquo; and you remain responsible for supervising your child&rsquo;s device
          use.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:support@littleloopapp.com">support@littleloopapp.com</a>. See also our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
