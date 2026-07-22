import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Support — LittleLoop',
  description: 'Get help with LittleLoop: contact us, common questions, and account management.',
};

export default function SupportPage() {
  return (
    <LegalPage title="LittleLoop Support" updated="July 22, 2026">
      <LegalSection heading="Contact us">
        <p>
          Need help, found a bug, or have a feature request? Email{' '}
          <a href="mailto:support@littleloopapp.com">support@littleloopapp.com</a> and we&rsquo;ll
          get back to you as soon as we can, usually within two business days.
        </p>
        <p>
          When reporting a problem, it helps to include your device model, your OS version, and a
          short description of what you expected versus what happened.
        </p>
      </LegalSection>

      <LegalSection heading="Common questions">
        <p>
          <strong>How do I add a video?</strong> Open YouTube (or any app with a share button),
          tap Share, and choose LittleLoop. Pick which child the video is for, review it, and it
          joins that child&rsquo;s approved loop.
        </p>
        <p>
          <strong>How does child mode work?</strong> Children see only the videos you approved.
          Leaving child mode requires your parent PIN, so the approved loop and the time limit stay
          in your control.
        </p>
        <p>
          <strong>I forgot my parent PIN.</strong> For your family&rsquo;s security the PIN is
          stored only on the device and cannot be recovered by us. You can reset it from Settings
          while signed in on the device, or sign out and back in to set a new one.
        </p>
        <p>
          <strong>How do I invite another caregiver?</strong> In Settings, use Family Sharing to
          send an invitation link. It expires after seven days and can be revoked at any time by
          the main caregiver.
        </p>
      </LegalSection>

      <LegalSection heading="Subscriptions &amp; billing">
        <p>
          LittleLoop Premium is billed through the Apple App Store or Google Play. To view, change,
          cancel, restore, or request a refund for your subscription, open Settings in the app and
          tap Manage Subscription — this opens the Customer Center, where all billing actions live.
        </p>
        <p>
          You can also manage or cancel any subscription directly in your{' '}
          <a href="https://apps.apple.com/account/subscriptions">App Store</a> or Google Play
          account settings.
        </p>
      </LegalSection>

      <LegalSection heading="Manage your data">
        <p>
          You can delete your account and all associated data at any time. See{' '}
          <a href="/delete-account">Delete your account</a> for instructions, and our{' '}
          <a href="/privacy">Privacy Policy</a> for details on what we collect and how it is used.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
