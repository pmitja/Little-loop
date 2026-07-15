import type { ChildProfile } from '@littleloop/shared';
import { updateChildProfile } from './updateChildProfile';
import { useAppStore, type ChildRules } from '@/stores/appStore';

export async function updateSharedChildRules(
  childProfileId: string,
  patch: Partial<ChildRules>,
): Promise<boolean> {
  useAppStore.getState().updateChildRules(childProfileId, patch);
  return updateChildProfile(childProfileId, patch as Partial<ChildProfile>);
}
