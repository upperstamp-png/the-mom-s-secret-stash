import { supabase } from "./supabase";

export async function registerPushNotifications() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    console.log("Notificações Push não suportadas pelo navegador.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.log("Permissão de Push negada.");
      return;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // VAPID keys fallback for environment
      const vapidPublicKey =
        (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
        "BEl62OhArw1b9e3s3bVp0hZ1V53OWhJ3a4l2o5K3r7tY";

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast keeps lib.dom typings happy across TS releases (BufferSource expects ArrayBuffer).
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from("push_tokens").upsert({
        profile_id: session.user.id,
        token: JSON.stringify(subscription),
        platform: getPlatform(),
      });
      console.log("Token de push registrado no banco de dados.");
    }
  } catch (err) {
    console.error("Erro ao registrar notificações push:", err);
  }
}

function getPlatform(): string {
  if (typeof window === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/ipad|iphone|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "web";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
