import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useProfile, useHydrated } from "@/lib/store";

interface AppShellProps {
  children: ReactNode;
  /** hides bottom nav (e.g. immersive screens) */
  bare?: boolean;
}

/**
 * Wraps authenticated app pages. Performs client-side gating:
 * not logged in -> /auth, logged in but not onboarded -> /onboarding.
 */
export function AppShell({ children, bare }: AppShellProps) {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const { profile } = useProfile();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.loggedIn) {
      navigate({ to: "/auth", replace: true });
    } else if (!profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [hydrated, profile.loggedIn, profile.onboarded, navigate]);

  if (!hydrated || !profile.loggedIn || !profile.onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <div className={bare ? "" : "pb-24"}>{children}</div>
      {!bare && <BottomNav />}
    </div>
  );
}
