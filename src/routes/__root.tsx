import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/store";
import { registerPushNotifications } from "../lib/push";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { InstallPrompt } from "../components/InstallPrompt";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <p className="text-6xl font-extrabold text-gradient-primary">404</p>
        <h2 className="mt-3 text-xl font-bold text-foreground">
          Achadinho não encontrado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa página voou junto com a promoção. Volta pra ver as ofertas do
          Clube.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow"
        >
          Voltar ao Clube
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold text-foreground">
          Algo deu errado por aqui
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tenta de novo ou volta para a página inicial do Clube.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { title: "Clube Secreto de Achadinhos para Mamães" },
      {
        name: "description",
        content:
          "O clube privado onde mães descobrem ofertas exclusivas de produtos infantis antes de todo mundo.",
      },
      { name: "theme-color", content: "#FF7A00" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Clube Secreto",
      },
      {
        property: "og:title",
        content: "Clube Secreto de Achadinhos para Mamães",
      },
      {
        property: "og:description",
        content:
          "Ofertas exclusivas de produtos infantis antes de todo mundo. Entre no clube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { update, reset } = useProfile();

  useEffect(() => {
    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;

          // Fetch profile details
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

          // Fetch children
          const { data: children } = await supabase
            .from("children")
            .select("*")
            .eq("profile_id", userId);

          // Fetch interests
          const { data: interests } = await supabase
            .from("interests")
            .select("category_id")
            .eq("profile_id", userId);

          // Fetch favorites
          const { data: favorites } = await supabase
            .from("favorites")
            .select("product_id")
            .eq("profile_id", userId);

          update({
            loggedIn: true,
            name: profile?.name || session.user.user_metadata?.name || "Mamãe",
            email: session.user.email || profile?.email || "",
            vip: profile?.vip || false,
            onboarded: profile?.onboarded || false,
            city: profile?.city || "",
            state: profile?.state || "",
            avatarUrl: profile?.avatar_url || session.user.user_metadata?.avatar_url || "",
            children: children ? children.map((c: any) => ({ id: c.id, name: c.name, ageMonths: c.age_months })) : [],
            interests: interests ? interests.map((i: any) => i.category_id) : [],
          });

          // Sync local storage favorites with database if needed
          if (favorites && favorites.length > 0) {
            const currentFavs = JSON.parse(localStorage.getItem("csa.favorites") || "[]");
            const dbFavIds = favorites.map((f: any) => f.product_id);
            const merged = Array.from(new Set([...currentFavs, ...dbFavIds]));
            localStorage.setItem("csa.favorites", JSON.stringify(merged));
          }

          registerPushNotifications().catch(() => {});
        }
      } catch (err) {
        console.error("Erro ao sincronizar sessão do Supabase:", err);
      }
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        syncSession();
      } else {
        reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [update, reset]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. */}
      <Outlet />
      <InstallPrompt />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
