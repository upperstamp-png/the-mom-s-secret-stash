import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Bell, Crown } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { OfferModal } from "@/components/OfferModal";
import { CategoryChips } from "@/components/CategoryChips";
import {
  PRODUCTS,
  type Product,
  type CategoryId,
} from "@/lib/products";
import { useProfile } from "@/lib/store";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clube Secreto de Achadinhos para Mamães" },
      {
        name: "description",
        content:
          "Feed exclusivo de ofertas de produtos infantis selecionadas para você. Entre no clube secreto das mamães.",
      },
      {
        property: "og:title",
        content: "Clube Secreto de Achadinhos para Mamães",
      },
      {
        property: "og:description",
        content: "Ofertas exclusivas de produtos infantis antes de todo mundo.",
      },
    ],
  }),
  component: HomePage,
});

const PAGE = 6;

function HomePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [active, setActive] = useState<CategoryId>("tudo");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [count, setCount] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const base =
      active === "tudo"
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === active);
    const q = query.trim().toLowerCase();
    const byQuery = q
      ? base.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q),
        )
      : base;
    // simulate an infinite feed by cycling the catalog
    const out: Product[] = [];
    for (let i = 0; i < count; i++) {
      const item = byQuery[i % byQuery.length];
      if (item) out.push({ ...item, id: `${item.id}-${i}` });
    }
    return out;
  }, [active, query, count]);

  useEffect(() => {
    setCount(PAGE);
  }, [active, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCount((c) => c + PAGE);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const firstName = profile.name?.split(" ")[0] || "mamãe";

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/85 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-2xl"
            />
            <div className="leading-tight">
              <p className="text-[11px] font-medium text-muted-foreground">
                Oi, {firstName} 🧡
              </p>
              <p className="text-[15px] font-extrabold text-foreground">
                Achadinhos de hoje
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: "/vip" })}
              aria-label="Clube VIP"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-vip text-secondary shadow-soft active:scale-90"
            >
              <Crown className="h-[18px] w-[18px]" />
            </button>
            <button
              aria-label="Notificações"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft active:scale-90"
            >
              <Bell className="h-[18px] w-[18px] text-foreground" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="O que você procura hoje?"
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <CategoryChips active={active} onChange={setActive} />

      {/* Feed */}
      <main className="px-4 pt-1">
        {loading ? (
          <div className="columns-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton mb-3 aspect-[9/16] w-full rounded-3xl"
                style={{ breakInside: "avoid" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 font-bold text-foreground">Nada por aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tenta outra busca ou categoria.
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-3">
            {filtered.map((p, i) => (
              <div key={p.id} style={{ breakInside: "avoid" }}>
                <ProductCard
                  product={p}
                  onOpen={setSelected}
                  priority={i < 2}
                />
              </div>
            ))}
          </div>
        )}
        <div ref={sentinel} className="h-10" />
      </main>

      <OfferModal product={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
