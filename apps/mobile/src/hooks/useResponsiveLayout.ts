import { useWindowDimensions } from 'react-native';
import * as Device from 'expo-device';
import { tabletLayout } from '@/theme/layout';

export function useResponsiveLayout(contentWidth?: number) {
  const { width, height } = useWindowDimensions();
  const isTablet = Device.deviceType === Device.DeviceType.TABLET;
  return { isTablet, width, height, ...tabletLayout(isTablet, width, contentWidth ?? width, height) };
}
