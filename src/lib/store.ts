import { useEffect, useSyncExternalStore, useCallback } from "react";

/* -------------------------------------------------------------------------- */
/*  Tiny localStorage-backed reactive store (client-only).                    */
/*  Used for MVP state: onboarding profile, favorites, auth, VIP.             */
/*  Designed to be swapped for Lovable Cloud later without UI changes.        */
/* -------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  if (typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emit();
}

function usePersistentValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      if (!raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
}

/* ----------------------------- Profile / onboarding ----------------------- */

export interface Child {
  id: string;
  name: string;
  ageMonths: number;
}

export interface Profile {
  name: string;
  email: string;
  children: Child[];
  interests: string[];
  onboarded: boolean;
  vip: boolean;
  loggedIn: boolean;
}

const PROFILE_KEY = "csa.profile";

const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  children: [],
  interests: [],
  onboarded: false,
  vip: false,
  loggedIn: false,
};

export function useProfile() {
  const profile = usePersistentValue<Profile>(PROFILE_KEY, DEFAULT_PROFILE);

  const update = useCallback((patch: Partial<Profile>) => {
    const current = read<Profile>(PROFILE_KEY, DEFAULT_PROFILE);
    write(PROFILE_KEY, { ...current, ...patch });
  }, []);

  const reset = useCallback(() => write(PROFILE_KEY, DEFAULT_PROFILE), []);

  return { profile, update, reset };
}

/* -------------------------------- Favorites ------------------------------- */

const FAV_KEY = "csa.favorites";

export function useFavorites() {
  const ids = usePersistentValue<string[]>(FAV_KEY, []);

  const toggle = useCallback((id: string) => {
    const current = read<string[]>(FAV_KEY, []);
    write(
      FAV_KEY,
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { favorites: ids, toggle, isFavorite };
}

/* ----------------------------- Hydration guard ---------------------------- */

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/* ----------------------------- Click analytics ---------------------------- */
/* Lightweight local event log — mirrors what the backend will capture.      */

const ANALYTICS_KEY = "csa.events";

export interface ClickEvent {
  productId: string;
  type: "offer_click" | "view" | "favorite";
  ts: number;
}

export function trackEvent(e: Omit<ClickEvent, "ts">) {
  const current = read<ClickEvent[]>(ANALYTICS_KEY, []);
  write(ANALYTICS_KEY, [...current.slice(-199), { ...e, ts: Date.now() }]);
}

export function useNoop() {
  useEffect(() => {}, []);
}
