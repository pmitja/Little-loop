import { api } from '@/lib/api';

export interface ChildDevice {
  id: string;
  childProfileId: string;
  name: string;
  platform: 'ios' | 'android';
  lastSeenAt: string;
  createdAt: string;
}

export const CHILD_DEVICES_QUERY_KEY = ['child-devices'] as const;

export async function fetchChildDevices(): Promise<ChildDevice[]> {
  const { devices } = await api<{ devices: ChildDevice[] }>('/child-devices');
  return devices;
}

/** Claim the code a kid device is showing, for one child. */
export async function claimChildDevice(input: {
  code: string;
  childProfileId: string;
}): Promise<ChildDevice> {
  const { device } = await api<{ device: ChildDevice }>('/child-devices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return device;
}

export async function updateChildDevice(
  id: string,
  patch: { name?: string; childProfileId?: string },
): Promise<ChildDevice> {
  const { device } = await api<{ device: ChildDevice }>(`/child-devices/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return device;
}

/** Unpair: the kid device resets to its pairing screen on its next sync. */
export async function unpairChildDevice(id: string): Promise<void> {
  await api(`/child-devices/${id}`, { method: 'DELETE' });
}

/** "Just now" / "5 min ago" / "3 h ago" / "2 days ago" for the device list. */
export function lastSeenLabel(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  // The server only refreshes lastSeenAt every few minutes.
  if (minutes < 10) return 'Active now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
