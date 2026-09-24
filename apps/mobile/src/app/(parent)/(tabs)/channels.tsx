import { Redirect } from 'expo-router';

/** Channels live inside the Playlist tab now; old links land on that segment. */
export default function ChannelsTab() {
  return <Redirect href={{ pathname: '/(parent)/(tabs)/playlist', params: { segment: 'channels' } }} />;
}
