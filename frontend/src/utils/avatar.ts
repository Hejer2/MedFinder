// frontend/src/utils/avatar.ts

export const DEFAULT_USER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><rect width="100%" height="100%" fill="%23f1f5f9"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

export const DEFAULT_PHARM_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310b981"><rect width="100%" height="100%" fill="%23ecfdf5"/><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>`;

export function getUserAvatar(userId: string | null | undefined): string {
  if (!userId) return DEFAULT_USER_AVATAR;
  const stored = localStorage.getItem(`avatar_${userId}`);
  return stored || DEFAULT_USER_AVATAR;
}

export function getPharmAvatar(pharmacy: any, baseURL?: string): string {
  if (!pharmacy) return DEFAULT_PHARM_AVATAR;
  
  if (pharmacy.avatar) {
    const cleanBaseURL = baseURL ? baseURL.replace('/api', '') : '';
    const cleanPath = pharmacy.avatar.replace('\\', '/');
    return `${cleanBaseURL}/${cleanPath}`;
  }
  
  const stored = localStorage.getItem(`avatar_${pharmacy.userId}`);
  return stored || DEFAULT_PHARM_AVATAR;
}
