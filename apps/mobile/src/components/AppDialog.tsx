import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { colors, controls, shadows } from '@/theme/tokens';
import { AppIcon, type AppIconName } from './AppIcon';
import { Txt } from './Txt';

export type AppDialogTone = 'info' | 'success' | 'warning' | 'destructive';
export type AppDialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppDialogButton {
  text: string;
  style?: AppDialogButtonStyle;
  onPress?: () => void | Promise<void>;
}

export interface AppDialogOptions {
  title: string;
  message?: string;
  buttons?: AppDialogButton[];
  tone?: AppDialogTone;
}

interface DialogState {
  queue: AppDialogOptions[];
  show: (dialog: AppDialogOptions) => void;
  dismiss: () => void;
}

const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  show: (dialog) => set((state) => ({ queue: [...state.queue, dialog] })),
  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}));

/** Show a branded LittleLoop dialog from a component, hook, or async helper. */
export function showAppDialog(dialog: AppDialogOptions): void {
  useDialogStore.getState().show(dialog);
}

/** Alert-compatible convenience API for migrating former native popups. */
export function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppDialogButton[],
  tone?: AppDialogTone,
): void {
  const normalizedTitle = title.toLowerCase();
  const inferredTone: AppDialogTone = buttons?.some(
    (button) => button.style === 'destructive',
  )
    ? 'destructive'
    : /restored|success|active/.test(normalizedTitle)
      ? 'success'
      : /failed|couldn|no |nothing|already|saved on/.test(normalizedTitle)
        ? 'warning'
        : 'info';
  showAppDialog({
    title,
    message,
    buttons,
    tone: tone ?? inferredTone,
  });
}

const TONE_ART: Record<AppDialogTone, { icon: AppIconName; background: string }> = {
  info: { icon: 'parent-hq', background: colors.primaryTint },
  success: { icon: 'restore', background: colors.greenTint },
  warning: { icon: 'warning', background: colors.amberTint },
  destructive: { icon: 'delete', background: colors.coralTint },
};

/** Single root-level host for every alert/confirmation in the app. */
export function AppDialogHost() {
  const dialog = useDialogStore((state) => state.queue[0]);
  const dismiss = useDialogStore((state) => state.dismiss);

  if (!dialog) return null;

  const tone = dialog.tone ?? 'info';
  const art = TONE_ART[tone];
  const buttons = dialog.buttons?.length
    ? dialog.buttons
    : [{ text: 'OK', style: 'default' as const }];

  const choose = (button: AppDialogButton) => {
    dismiss();
    void button.onPress?.();
  };

  const cancel = buttons.find((button) => button.style === 'cancel');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => (cancel ? choose(cancel) : dismiss())}
    >
      <View style={styles.backdrop}>
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={[styles.iconStage, { backgroundColor: art.background }]}>
            <AppIcon name={art.icon} size={42} />
          </View>
          <Txt weight="black" size={22} lineHeight={28} center>
            {dialog.title}
          </Txt>
          {dialog.message ? (
            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              <Txt weight="semibold" size={14.5} lineHeight={21} color={colors.parent.muted} center>
                {dialog.message}
              </Txt>
            </ScrollView>
          ) : null}
          <View style={styles.actions}>
            {buttons.map((button) => {
              const destructive = button.style === 'destructive';
              const cancelButton = button.style === 'cancel';
              return (
                <Pressable
                  key={button.text}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                  onPress={() => choose(button)}
                  style={({ pressed }) => [
                    styles.button,
                    destructive
                      ? styles.destructiveButton
                      : cancelButton
                        ? styles.cancelButton
                        : styles.defaultButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Txt
                    weight="extrabold"
                    size={15}
                    color={destructive || !cancelButton ? '#FFFFFF' : colors.parent.night}
                    center
                  >
                    {button.text}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,32,51,.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: colors.parent.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.parent.hairline,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    ...shadows.cardLg,
    shadowOpacity: 0.28,
  },
  iconStage: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  messageScroll: { flexShrink: 1, alignSelf: 'stretch', marginTop: 9 },
  messageContent: { paddingHorizontal: 2, paddingBottom: 2 },
  actions: { alignSelf: 'stretch', gap: 9, marginTop: 22 },
  button: {
    minHeight: controls.minTouchParent + 4,
    borderRadius: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultButton: { backgroundColor: colors.primaryDark },
  destructiveButton: { backgroundColor: colors.coral },
  cancelButton: { backgroundColor: colors.parent.paper },
  buttonPressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
});
