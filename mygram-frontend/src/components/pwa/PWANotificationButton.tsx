import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { mygramApi } from "@/api/mygram";
import type { Comment, Photo, PushSubscriptionPayload } from "@/api/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const pollMs = 30_000;
const iconPath = "/icons/mygram-icon-192.png";

type NotificationDeliveryMode = "push" | "polling" | null;

function ownerId(photo: Photo) {
  return photo.user_id ?? photo.UserID ?? 0;
}

function commentOwnerId(comment: Comment) {
  return comment.user_id ?? comment.UserID ?? 0;
}

function commentPhotoId(comment: Comment) {
  return comment.photo_id ?? comment.PhotoID ?? 0;
}

function maxId(items: Array<{ id: number }>) {
  return items.reduce((current, item) => Math.max(current, item.id), 0);
}

function readCursor(key: string) {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCursor(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Notification cursors are a convenience; ignore private browsing storage failures.
  }
}

async function showNotification(title: string, body: string, url: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon: iconPath,
    badge: iconPath,
    tag,
    data: { url },
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    if (registration) {
      await registration.showNotification(title, notificationOptions);
      return;
    }
  }

  new Notification(title, notificationOptions);
}

function base64UrlToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

function pushSubscriptionToPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON() as PushSubscriptionJSON & {
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };

  return {
    endpoint: json.endpoint ?? subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
    user_agent: navigator.userAgent.slice(0, 512),
  };
}

export function PWANotificationButton() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isRequesting, setIsRequesting] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<NotificationDeliveryMode>(null);
  const isPollingRef = useRef(false);
  const isSyncingPushRef = useRef(false);
  const isSupported = typeof window !== "undefined" && "Notification" in window;
  const pushSupported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  const keys = useMemo(() => {
    const userId = user?.id ?? "anonymous";
    return {
      preference: `mygram:notifications:${userId}:enabled`,
      photos: `mygram:notifications:${userId}:last-photo-id`,
      comments: `mygram:notifications:${userId}:last-comment-id`,
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isSupported || !user?.id) {
      setEnabled(false);
      return;
    }

    setPermission(Notification.permission);
    setEnabled(window.localStorage.getItem(keys.preference) === "true");
  }, [isSupported, keys.preference, user?.id]);

  const registerWebPushSubscription = useCallback(async () => {
    if (!pushSupported || isSyncingPushRef.current) {
      setDeliveryMode("polling");
      return false;
    }

    isSyncingPushRef.current = true;
    try {
      const vapid = await mygramApi.getPushVapidPublicKey();
      if (!vapid.enabled || !vapid.public_key) {
        setDeliveryMode("polling");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapid.public_key),
        });
      }

      await mygramApi.savePushSubscription(pushSubscriptionToPayload(subscription));
      setDeliveryMode("push");
      return true;
    } catch {
      setDeliveryMode("polling");
      return false;
    } finally {
      isSyncingPushRef.current = false;
    }
  }, [pushSupported]);

  const unregisterWebPushSubscription = useCallback(async () => {
    if (!pushSupported) {
      setDeliveryMode(null);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await mygramApi.deletePushSubscription(subscription.endpoint).catch(() => undefined);
        await subscription.unsubscribe().catch(() => undefined);
      }
    } finally {
      setDeliveryMode(null);
    }
  }, [pushSupported]);

  const pollNotifications = useCallback(async () => {
    if (!user?.id || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    try {
      const [photos, comments] = await Promise.all([
        mygramApi.listPhotos(),
        mygramApi.listComments(),
      ]);

      const latestPhotoId = maxId(photos);
      const latestCommentId = maxId(comments);
      const previousPhotoId = readCursor(keys.photos);
      const previousCommentId = readCursor(keys.comments);

      if (previousPhotoId === null || previousCommentId === null) {
        writeCursor(keys.photos, latestPhotoId);
        writeCursor(keys.comments, latestCommentId);
        return;
      }

      const ownedPhotoIds = new Set(
        photos.filter((photo) => ownerId(photo) === user.id).map((photo) => photo.id),
      );
      const newPhotos = photos.filter(
        (photo) => photo.id > previousPhotoId && ownerId(photo) !== user.id,
      );
      const newCommentsForOwnedPhotos = comments.filter(
        (comment) =>
          comment.id > previousCommentId &&
          ownedPhotoIds.has(commentPhotoId(comment)) &&
          commentOwnerId(comment) !== user.id,
      );

      if (newPhotos.length > 0) {
        await showNotification(
          "New post on MyGram",
          `${newPhotos.length} new photo${newPhotos.length > 1 ? "s" : ""} in the feed.`,
          "/feed",
          "mygram-new-posts",
        );
      }

      if (newCommentsForOwnedPhotos.length > 0) {
        await showNotification(
          "New comment on your post",
          `${newCommentsForOwnedPhotos.length} new comment${
            newCommentsForOwnedPhotos.length > 1 ? "s" : ""
          } on your photo${newCommentsForOwnedPhotos.length > 1 ? "s" : ""}.`,
          "/feed",
          "mygram-owned-photo-comments",
        );
      }

      writeCursor(keys.photos, latestPhotoId);
      writeCursor(keys.comments, latestCommentId);
    } catch {
      // Polling should never interrupt app usage.
    } finally {
      isPollingRef.current = false;
    }
  }, [keys.comments, keys.photos, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !enabled || permission !== "granted") {
      setDeliveryMode(null);
      return;
    }

    void registerWebPushSubscription();
  }, [enabled, isAuthenticated, permission, registerWebPushSubscription, user?.id]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user?.id ||
      !enabled ||
      permission !== "granted" ||
      deliveryMode !== "polling"
    ) {
      return;
    }

    void pollNotifications();
    const intervalId = window.setInterval(() => {
      void pollNotifications();
    }, pollMs);

    return () => window.clearInterval(intervalId);
  }, [deliveryMode, enabled, isAuthenticated, permission, pollNotifications, user?.id]);

  async function toggleNotifications() {
    if (!isSupported || !user?.id) {
      toast.error("This browser does not support notifications.");
      return;
    }

    if (enabled) {
      setIsRequesting(true);
      try {
        await unregisterWebPushSubscription();
        window.localStorage.setItem(keys.preference, "false");
        setEnabled(false);
        toast.success("Notifications paused");
      } finally {
        setIsRequesting(false);
      }
      return;
    }

    setIsRequesting(true);
    try {
      const nextPermission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        toast.error("Notification permission was not granted.");
        return;
      }

      window.localStorage.setItem(keys.preference, "true");
      setEnabled(true);
      const registeredForPush = await registerWebPushSubscription();
      if (registeredForPush) {
        toast.success("Push notifications enabled");
      } else {
        toast.success("Notifications enabled with app polling fallback");
      }
    } finally {
      setIsRequesting(false);
    }
  }

  if (!isAuthenticated || !user?.id || !isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={enabled ? "Pause MyGram notifications" : "Enable MyGram notifications"}
      aria-pressed={enabled}
      title={
        enabled
          ? deliveryMode === "push"
            ? "Pause background push notifications"
            : "Pause in-app notification checks"
          : "Enable post and comment notifications"
      }
      className={cn(enabled && "border-primary text-primary")}
      onClick={() => {
        void toggleNotifications();
      }}
      disabled={isRequesting}
    >
      {isRequesting ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : enabled ? (
        <Bell className="h-4 w-4" aria-hidden="true" />
      ) : (
        <BellOff className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
