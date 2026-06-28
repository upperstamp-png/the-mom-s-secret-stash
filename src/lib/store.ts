import { useEffect, useSyncExternalStore, useCallback, useState } from "react";

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

// Cache parsed snapshots so getSnapshot returns a stable reference while the
// underlying raw string is unchanged. Without this, JSON.parse creates a new
// object every render and useSyncExternalStore loops infinitely.
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function usePersistentValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => {
      const raw =
        typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      const cached = snapshotCache.get(key);
      if (cached && cached.raw === raw) return cached.value as T;

      let value: T = fallback;
      if (raw) {
        try {
          value = JSON.parse(raw) as T;
        } catch {
          value = fallback;
        }
      }
      snapshotCache.set(key, { raw, value });
      return value;
    },
    () => fallback,
  );
}

/* ----------------------------- Profile / onboarding ----------------------- */

import { supabase } from "./supabase";

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
  city?: string;
  state?: string;
  avatarUrl?: string;
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
  city: "",
  state: "",
  avatarUrl: "",
};

export function useProfile() {
  const profile = usePersistentValue<Profile>(PROFILE_KEY, DEFAULT_PROFILE);

  const update = useCallback((patch: Partial<Profile>) => {
    const current = read<Profile>(PROFILE_KEY, DEFAULT_PROFILE);
    const next = { ...current, ...patch };
    write(PROFILE_KEY, next);

    // Sync with Supabase in the background if the user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const userId = session.user.id;

      // 1. Update basic profile info
      const profileUpdates: any = {};
      if (patch.name !== undefined) profileUpdates.name = patch.name;
      if (patch.onboarded !== undefined) profileUpdates.onboarded = patch.onboarded;
      if (patch.vip !== undefined) profileUpdates.vip = patch.vip;
      if (patch.city !== undefined) profileUpdates.city = patch.city;
      if (patch.state !== undefined) profileUpdates.state = patch.state;
      if (patch.avatarUrl !== undefined) profileUpdates.avatar_url = patch.avatarUrl;

      if (Object.keys(profileUpdates).length > 0) {
        supabase.from("profiles").update(profileUpdates).eq("id", userId).then();
      }

      // 2. Sync children
      if (patch.children !== undefined) {
        supabase.from("children").delete().eq("profile_id", userId).then(() => {
          if (patch.children && patch.children.length > 0) {
            const rows = patch.children.map((c) => ({
              profile_id: userId,
              name: c.name,
              age_months: c.ageMonths,
            }));
            supabase.from("children").insert(rows).then();
          }
        });
      }

      // 3. Sync interests
      if (patch.interests !== undefined) {
        supabase.from("interests").delete().eq("profile_id", userId).then(() => {
          if (patch.interests && patch.interests.length > 0) {
            const rows = patch.interests.map((catId) => ({
              profile_id: userId,
              category_id: catId,
            }));
            supabase.from("interests").insert(rows).then();
          }
        });
      }
    });
  }, []);

  const reset = useCallback(() => {
    write(PROFILE_KEY, DEFAULT_PROFILE);
    supabase.auth.signOut().then();
  }, []);

  return { profile, update, reset };
}

/* -------------------------------- Favorites ------------------------------- */

const FAV_KEY = "csa.favorites";

export function useFavorites() {
  const ids = usePersistentValue<string[]>(FAV_KEY, []);

  const toggle = useCallback((id: string) => {
    const current = read<string[]>(FAV_KEY, []);
    const cleanId = id.split("-")[0];
    const isFav = current.includes(id);
    const next = isFav ? current.filter((x) => x !== id) : [...current, id];
    write(FAV_KEY, next);

    // Sync favorite with Supabase in the background
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const userId = session.user.id;

      if (isFav) {
        supabase.from("favorites")
          .delete()
          .eq("profile_id", userId)
          .eq("product_id", cleanId)
          .then();
      } else {
        supabase.from("favorites")
          .insert({ profile_id: userId, product_id: cleanId })
          .then();
      }
    });
  }, []);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  return { favorites: ids, toggle, isFavorite };
}

/* ----------------------------- Hydration guard ---------------------------- */

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
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

  const cleanId = e.productId.split("-")[0];
  
  // Real backend analytics call
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: cleanId.match(/^[0-9a-fA-F-]{36}$/) ? cleanId : null,
      event_type: e.type === "offer_click" ? "click_affiliate" : e.type === "view" ? "product_view" : "favorite",
    }),
  }).catch(() => {});
}

export function useNoop() {
  useEffect(() => {}, []);
}

