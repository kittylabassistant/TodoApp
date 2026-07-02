/**
 * Thin wrappers around the Notifications + Service Worker APIs.
 *
 * iOS only shows web notifications for an installed (standalone) PWA, only allows
 * `Notification.requestPermission()` from a user gesture, and has no `Notification`
 * constructor — notifications must be shown via the service worker registration.
 */

export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    typeof ServiceWorkerRegistration !== "undefined" &&
    "showNotification" in ServiceWorkerRegistration.prototype
  );
}

/**
 * Requests notification permission. Must be called synchronously from a user
 * gesture handler (before any `await`) to satisfy iOS.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Resolves the active service worker registration, giving up after `timeoutMs`
 * so callers don't hang forever when no SW is controlling the page (e.g. dev).
 */
async function getReadyRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return null;
  }
}

/**
 * Shows a notification through the service worker. Returns false (and never throws)
 * when unsupported, not permitted, or no service worker is ready.
 */
export async function showLocalNotification(
  title: string,
  options: NotificationOptions = {},
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") return false;

  const registration = await getReadyRegistration();
  if (!registration) return false;

  try {
    await registration.showNotification(title, {
      icon: "/logo192.png",
      badge: "/logo192.png",
      ...options,
    });
    return true;
  } catch (error) {
    console.error("Failed to show notification:", error);
    return false;
  }
}
