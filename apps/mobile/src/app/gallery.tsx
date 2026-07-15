import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AVATAR_IDS } from '@littleloop/shared';
import {
  AddVideoIllustration,
  Button,
  Card,
  ChildAvatar,
  EmptyState,
  ParentHeader,
  PINBoxes,
  PINKeypad,
  ScreenContainer,
  SectionLabel,
  SettingsGroup,
  SettingsRow,
  Txt,
} from '@/components';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/tokens';

/** Internal dev screen for visual sign-off of every design-system component. */
export default function Gallery() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [toggle, setToggle] = useState(true);

  return (
    <ScreenContainer scroll style={styles.container}>
      <ParentHeader title="Component Gallery" subtitle="dev only" onBack={() => router.back()} />

      <SectionLabel style={styles.label}>Logo</SectionLabel>
      <View style={styles.row}>
        <Logo size={64} />
        <Logo size={44} />
      </View>

      <SectionLabel style={styles.label}>Buttons</SectionLabel>
      <View style={{ gap: 12 }}>
        <Button title="Primary" onPress={() => {}} />
        <Button title="Coral gradient" variant="coral" onPress={() => {}} />
        <Button title="Outline" variant="outline" onPress={() => {}} />
        <Button title="Ghost" variant="ghost" onPress={() => {}} />
        <Button title="Loading" loading onPress={() => {}} />
      </View>

      <SectionLabel style={styles.label}>Card</SectionLabel>
      <Card>
        <Txt weight="extrabold" size={15}>
          Card title
        </Txt>
        <Txt weight="semibold" size={13} color={colors.muted}>
          Soft shadow, radius 20.
        </Txt>
      </Card>

      <SectionLabel style={styles.label}>Child avatars</SectionLabel>
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        {AVATAR_IDS.map((id, i) => (
          <ChildAvatar key={id} avatar={id} size={48} selected={i === 0} />
        ))}
      </View>

      <SectionLabel style={styles.label}>PIN keypad + boxes</SectionLabel>
      <View style={{ alignItems: 'center', gap: 24 }}>
        <PINBoxes filled={pin.length} />
        <PINKeypad
          onDigit={(d) => setPin((p) => (p.length < 4 ? p + d : p))}
          onDelete={() => setPin((p) => p.slice(0, -1))}
        />
      </View>

      <SectionLabel style={styles.label}>Empty state</SectionLabel>
      <EmptyState
        illustration={<AddVideoIllustration />}
        title="Start with your first approved video"
        body="Add videos manually. Your child will only be able to watch what you choose."
        ctaLabel="Add Video"
        onCta={() => {}}
        secondaryLabel="Skip for now"
        onSecondary={() => {}}
      />

      <SectionLabel style={styles.label}>Settings rows</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={<Txt size={14}>🔒</Txt>}
          iconBg={colors.primaryTint}
          label="Change Parent PIN"
          chevron
          onPress={() => {}}
        />
        <SettingsRow
          icon={<Txt size={14}>✨</Txt>}
          iconBg={colors.greenTint}
          label="Pause videos at bedtime"
          toggle={{ value: toggle, onChange: setToggle }}
        />
        <SettingsRow
          icon={<Txt size={14}>⏰</Txt>}
          iconBg={colors.amberTint}
          label="Daily time limit"
          value="45 min"
          chevron
          onPress={() => {}}
        />
      </SettingsGroup>
      <View style={{ height: 48 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 24 },
  label: { marginTop: 28, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
