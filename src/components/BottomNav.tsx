import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, User } from "lucide-react";
import { useFavorites } from "@/lib/store";

const ITEMS = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/categorias", label: "Categorias", icon: LayoutGrid, exact: false },
  { to: "/favoritos", label: "Favoritos", icon: Heart, exact: false },
  { to: "/perfil", label: "Perfil", icon: User, exact: false },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { favorites } = useFavorites();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.to
            : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center gap-1 py-2.5"
            >
              <span
                className={`relative flex h-9 w-12 items-center justify-center rounded-full transition-all ${
                  active ? "bg-accent" : ""
                }`}
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                {item.to === "/favoritos" && favorites.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {favorites.length}
                  </span>
                )}
              </span>
              <span
                className={`text-[11px] font-semibold transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
