import type { FamilySummary } from '@littleloop/shared';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { useEntitlementStore } from '@/stores/entitlementStore';
import { syncChildProfiles } from './syncChildProfiles';

export async function fetchFamily(): Promise<FamilySummary> {
  const { family } = await api<{ family: FamilySummary }>('/family');
  useAppStore.getState().setFamilyRole(family.role);
  useAppStore.getState().setOnboardingComplete(true);
  return family;
}

export async function createFamilyInvite(): Promise<{
  id: string;
  token: string;
  expiresAt: string;
}> {
  const { invite } = await api<{
    invite: { id: string; token: string; expiresAt: string };
  }>('/family/invites', { method: 'POST' });
  return invite;
}

export async function revokeFamilyInvite(id: string): Promise<void> {
  await api(`/family/invites/${id}`, { method: 'DELETE' });
}

export async function removeFamilyMember(id: string): Promise<void> {
  await api(`/family/members/${id}`, { method: 'DELETE' });
}

export async function acceptFamilyInvite(token: string): Promise<FamilySummary> {
  const { family } = await api<{ family: FamilySummary }>('/family/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  const { entitlement } = await api<{ entitlement: { isPremium: boolean } }>('/subscription');
  useAppStore.getState().setFamilyRole(family.role);
  useAppStore.getState().setPendingFamilyInvite(null);
  useEntitlementStore.getState().setFamilyPremium(entitlement.isPremium);
  await syncChildProfiles();
  return family;
}
