import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

/** Parent screens that can open beside a list on an iPad instead of being pushed. */
export type PaneRoute =
  | 'time-limit'
  | 'edit-child'
  | 'safety'
  | 'change-pin'
  | 'family'
  | 'kid-devices'
  | 'caregivers'
  | 'channel';

export interface PaneEntry {
  route: PaneRoute;
  params?: Record<string, string>;
}

interface PaneState {
  stack: PaneEntry[];
  push: (entry: PaneEntry) => void;
  pop: () => void;
}

const PaneContext = createContext<PaneState | null>(null);

const HREFS: Record<PaneRoute, string> = {
  'time-limit': '/(parent)/time-limit',
  'edit-child': '/(parent)/edit-child',
  safety: '/(parent)/safety',
  'change-pin': '/(parent)/change-pin',
  family: '/(parent)/family',
  'kid-devices': '/(parent)/kid-devices',
  caregivers: '/(parent)/caregivers',
  channel: '/(parent)/channel',
};

/**
 * Holds the stack of the right-hand pane. A pane screen that opens another
 * (Grown-up PIN → Change PIN) stacks it here; its back button pops it again.
 * The owner re-keys this provider to start over when the list selection changes.
 */
export function DetailPaneProvider({
  root,
  onExit,
  children,
}: {
  root: PaneEntry;
  /** Called when the root screen asks to go back (it removed what it showed). */
  onExit?: () => void;
  children: ReactNode;
}) {
  const [stack, setStack] = useState<PaneEntry[]>([root]);
  const push = useCallback((entry: PaneEntry) => setStack((current) => [...current, entry]), []);
  const pop = useCallback(() => {
    if (stack.length > 1) setStack((current) => current.slice(0, -1));
    else onExit?.();
  }, [stack.length, onExit]);
  const value = useMemo(() => ({ stack, push, pop }), [stack, push, pop]);
  return <PaneContext.Provider value={value}>{children}</PaneContext.Provider>;
}

export function useInPane(): boolean {
  return useContext(PaneContext) !== null;
}

export function usePaneTop(): PaneEntry | null {
  const pane = useContext(PaneContext);
  return pane ? pane.stack[pane.stack.length - 1] : null;
}

/**
 * Navigation for a screen that may be shown either as its own route (phone) or
 * inside a split-view pane (iPad). Params, back and forward all route through
 * whichever one is hosting it.
 */
export function usePane<P extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  const pane = useContext(PaneContext);
  const router = useRouter();
  const routeParams = useLocalSearchParams();

  if (!pane) {
    return {
      inPane: false,
      params: routeParams as P,
      /** False at the root of a pane, where there is nothing to go back to. */
      canGoBack: true,
      back: () => router.back(),
      open: (route: PaneRoute, params?: Record<string, string>) =>
        router.push({ pathname: HREFS[route], params } as Href),
    };
  }

  const top = pane.stack[pane.stack.length - 1];
  return {
    inPane: true,
    params: (top.params ?? {}) as P,
    canGoBack: pane.stack.length > 1,
    back: pane.pop,
    open: (route: PaneRoute, params?: Record<string, string>) => pane.push({ route, params }),
  };
}
