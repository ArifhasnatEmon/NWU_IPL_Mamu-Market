/**
 * Expiry timer utilities for hero slides and ticker announcements.
 */

// Duration presets (in milliseconds)
export const DURATION_PRESETS = [
  { label: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '5d', ms: 5 * 24 * 60 * 60 * 1000 },
  { label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '∞', ms: 0 }, // 0 = no expiry
];

/**
 * Compute an ISO expiresAt timestamp from a duration in ms.
 * Returns null if duration is 0 (no expiry).
 */
export const computeExpiresAt = (durationMs: number): string | null => {
  if (durationMs <= 0) return null;
  return new Date(Date.now() + durationMs).toISOString();
};

/**
 * Compute expiresAt from custom days + hours.
 */
export const computeCustomExpiresAt = (days: number, hours: number): string | null => {
  const totalMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);
  if (totalMs <= 0) return null;
  return new Date(Date.now() + totalMs).toISOString();
};

/**
 * Check if an item has expired.
 */
export const isExpired = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return false; // null = never expires
  return new Date(expiresAt).getTime() < Date.now();
};

/**
 * Get human-readable time left string.
 * - > 1 day: "5 days left"
 * - < 1 day: "5h 23m left"
 * - expired: "Expired"
 * - no expiry: null (don't show badge)
 */
export const getTimeLeft = (expiresAt: string | null | undefined): string | null => {
  if (!expiresAt) return null; // No badge for items without expiry

  const diff = new Date(expiresAt).getTime() - Date.now();

  if (diff <= 0) return 'Expired';

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (totalDays >= 1) {
    const remainingHours = totalHours - (totalDays * 24);
    return remainingHours > 0
      ? `${totalDays}d ${remainingHours}h left`
      : `${totalDays} day${totalDays > 1 ? 's' : ''} left`;
  }

  const remainingMinutes = totalMinutes - (totalHours * 60);
  return `${totalHours}h ${remainingMinutes}m left`;
};
