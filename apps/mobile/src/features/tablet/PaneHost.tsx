import type { ComponentType, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailPaneProvider, Txt, usePaneTop, type PaneEntry, type PaneRoute } from '@/components';
import { colors } from '@/theme/tokens';
import TimeLimit from '@/app/(parent)/time-limit';
import EditChild from '@/app/(parent)/edit-child';
import Safety from '@/app/(parent)/safety';
import ChangePin from '@/app/(parent)/change-pin';
import Family from '@/app/(parent)/family';
import KidDevices from '@/app/(parent)/kid-devices';
import Caregivers from '@/app/(parent)/caregivers';
import ChannelDetail from '@/app/(parent)/channel';

export const PANE_BG = '#FBF9F5';

const SCREENS: Record<PaneRoute, ComponentType> = {
  'time-limit': TimeLimit,
  'edit-child': EditChild,
  safety: Safety,
  'change-pin': ChangePin,
  family: Family,
  'kid-devices': KidDevices,
  caregivers: Caregivers,
  channel: ChannelDetail,
};

function PaneBody() {
  const top = usePaneTop();
  if (!top) return null;
  const Screen = SCREENS[top.route];
  return <Screen key={`${top.route}:${JSON.stringify(top.params ?? {})}`} />;
}

/** The right-hand side of an iPad split view: the picked item's own screen. */
export function PaneHost({ root, empty, onExit }: { root: PaneEntry | null; empty?: string; onExit?: () => void }) {
  if (!root) return <PanePlaceholder text={empty ?? 'Pick something to see it here'} />;
  return (
    <View style={styles.pane}>
      <DetailPaneProvider key={`${root.route}:${JSON.stringify(root.params ?? {})}`} root={root} onExit={onExit}>
        <PaneBody />
      </DetailPaneProvider>
    </View>
  );
}

export function PanePlaceholder({ text }: { text: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pane, styles.placeholder, { paddingTop: insets.top + 24 }]}>
      <Txt weight="bold" size={15} color="#A59DA9">{text}</Txt>
    </View>
  );
}

/** List on the left, detail on the right, a hairline between them. */
export function SplitView({ listWidth, list, detail }: { listWidth: number; list: ReactNode; detail: ReactNode }) {
  return (
    <View style={styles.split}>
      <View style={[styles.list, { width: listWidth }]}>{list}</View>
      <View style={styles.detail}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  list: { borderRightWidth: 1, borderRightColor: colors.parent.hairline },
  detail: { flex: 1, minWidth: 0, backgroundColor: PANE_BG },
  pane: { flex: 1, backgroundColor: PANE_BG },
  placeholder: { paddingHorizontal: 40 },
});
