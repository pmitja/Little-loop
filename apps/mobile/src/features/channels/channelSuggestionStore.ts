import { create } from 'zustand';
import type { VideoMeta } from '@littleloop/shared';

/**
 * Transient (not persisted) hand-off between "approve channel" and the
 * channel-approved pick-list screen — holds the just-fetched backfill so we
 * don't round-trip the suggestions through navigation params.
 */
interface ChannelSuggestionState {
  childProfileId: string | null;
  channelTitle: string;
  suggestions: VideoMeta[];
  set: (childProfileId: string, channelTitle: string, suggestions: VideoMeta[]) => void;
  clear: () => void;
}

export const useChannelSuggestionStore = create<ChannelSuggestionState>((set) => ({
  childProfileId: null,
  channelTitle: '',
  suggestions: [],
  set: (childProfileId, channelTitle, suggestions) =>
    set({ childProfileId, channelTitle, suggestions }),
  clear: () => set({ childProfileId: null, channelTitle: '', suggestions: [] }),
}));
