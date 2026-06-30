import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Bell, Crown, Loader2, RefreshCcw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { OfferModal } from "@/components/OfferModal";
import { CategoryChips } from "@/components/CategoryChips";
import { type Product, type CategoryId } from "@/lib/products";
import { useInfiniteFeed, flattenFeed } from "@/lib/feed";
import { useProfile } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ofertas Mamis — ofertasmamis.online" },
      {
        name: "description",
        content:
          "Feed exclusivo de ofertas de produtos infantis selecionadas para você no ofertasmamis.online.",
      },
      {
        property: "og:title",
        content: "Ofertas Mamis — ofertasmamis.online",
      },
      {
        property: "og:description",
        content: "Ofertas exclusivas de produtos infantis antes de todo mundo.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [active, setActive] = useState<CategoryId>("tudo");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Debounce do campo de busca pra não disparar fetch a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteFeed({ category: active, query: debouncedQuery });

  const products = useMemo(() => flattenFeed(data?.pages), [data?.pages]);

  const [col1, col2] = useMemo(() => {
    const left: Product[] = [];
    const right: Product[] = [];
    products.forEach((p, idx) => {
      if (idx % 2 === 0) left.push(p);
      else right.push(p);
    });
    return [left, right];
  }, [products]);

  // IntersectionObserver — dispara prefetch quando o sentinela está a ~500px
  // do viewport. Nunca dispara enquanto já há um fetch em andamento.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (isFetchingNextPage) return;
        if (!hasNextPage) return;
        fetchNextPage();
      },
      { rootMargin: "500px 0px 500px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const firstName = profile.name?.split(" ")[0] || "mamãe";

  return (
    <AppShell>
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 bg-background/60 px-4 py-2.5 backdrop-blur-xl border-b border-border/5 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 hover:bg-muted/75 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no clube..."
            className="w-full bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => navigate({ to: "/vip" })}
          aria-label="Clube VIP"
          className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 active:scale-90 transition-all"
        >
          <Crown className="h-4.5 w-4.5" />
        </button>
        <button
          aria-label="Notificações"
          className="relative flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-muted/65 text-foreground active:scale-90 transition-all"
        >
          <Bell className="h-4.5 w-4.5 text-foreground" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
      </header>

      <CategoryChips active={active} onChange={setActive} />

      {/* Feed */}
      <main className="px-4 pt-4">
        {isLoading ? (
          <InitialSkeleton />
        ) : isError ? (
          <FeedErrorState
            onRetry={() => refetch()}
            retrying={isRefetching}
          />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 font-bold text-foreground">Nada por aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">Tenta outra busca ou categoria.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-3 items-start">
              {/* Left Column */}
              <div className="flex-1 flex flex-col gap-3">
                {col1.map((p, i) => (
                  <ProductCard
                    key={`${p.id}-L${i}`}
                    product={p}
                    onOpen={setSelected}
                    priority={i < 1}
                    index={i * 2}
                  />
                ))}
              </div>
              {/* Right Column (Staggered offset filled with VIP promo) */}
              <div className="flex-1 flex flex-col gap-3">
                <Link
                  to="/vip"
                  aria-label="Entrar no Clube VIP por R$ 9,99/mês"
                  className="relative block w-full h-[180px] rounded-[24px] overflow-hidden shadow-soft border border-primary/20 bg-gradient-vip active:scale-[0.99] transition-transform"
                >
                  {/* Selo Exclusivo — pin no topo, fora do flow vertical */}
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-2.5 py-[3px] text-[8px] font-black tracking-[0.12em] text-primary uppercase shadow-sm">
                    Exclusivo
                  </span>

                  {/* 3 blocos verticais: ícone (topo), texto+preço (centro),
                      botão (base). justify-between distribui igualmente. */}
                  <div className="flex h-full flex-col items-center justify-between px-3 pt-7 pb-3 text-center text-white">
                    {/* Bloco 1 — Ícone */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/30 shadow-glow">
                      <Crown className="h-5 w-5 text-white" fill="currentColor" />
                    </div>

                    {/* Bloco 2 — Título + subtítulo + preço, agrupados */}
                    <div className="flex flex-col items-center gap-0.5">
                      <p className="text-[13px] font-black uppercase tracking-wide leading-none drop-shadow-sm">
                        Clube VIP
                      </p>
                      <p className="text-[10px] font-medium text-white/85 leading-tight">
                        Ofertas antes de todo mundo
                      </p>
                      <div className="flex items-baseline gap-0.5 mt-1">
                        <span className="text-[17px] font-black leading-none">R$ 9,99</span>
                        <span className="text-[9px] font-bold text-white/80 leading-none">/mês</span>
                      </div>
                    </div>

                    {/* Bloco 3 — CTA */}
                    <span className="rounded-full bg-white px-4 py-1.5 text-[10px] font-black tracking-wide text-primary shadow-sm">
                      QUERO ENTRAR
                    </span>
                  </div>
                </Link>
                {col2.map((p, i) => (
                  <ProductCard
                    key={`${p.id}-R${i}`}
                    product={p}
                    onOpen={setSelected}
                    priority={i < 1}
                    index={i * 2 + 1}
                  />
                ))}
              </div>
            </div>

            {/* Skeleton incremental enquanto a próxima página carrega.
                Antes existia um segundo indicador "Carregando mais achadinhos…"
                que aparecia quando NÃO estava fazendo fetch — mas como o feed
                é infinito (hasNextPage sempre true) e o IntersectionObserver
                tem rootMargin de 500px, o ciclo skeleton ↔ texto piscava.
                Mantemos só o skeleton. */}
            {isFetchingNextPage && <IncrementalSkeleton />}
          </>
        )}

        {/* Sentinela do IntersectionObserver — fica ~500px abaixo da última linha */}
        <div ref={sentinel} className="h-10" aria-hidden="true" />
      </main>

      <OfferModal product={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Estados auxiliares
// ---------------------------------------------------------------------------

function InitialSkeleton() {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 flex flex-col gap-3">
        {[0, 2, 4].map((i) => {
          const aspect =
            i % 3 === 0 ? "aspect-[9/16]" : i % 3 === 1 ? "aspect-[9/14.5]" : "aspect-[9/18]";
          return <div key={i} className={`skeleton w-full ${aspect} rounded-[24px]`} />;
        })}
      </div>
      <div className="flex-1 flex flex-col gap-3 pt-[180px]">
        {[1, 3, 5].map((i) => {
          const aspect =
            i % 3 === 0 ? "aspect-[9/16]" : i % 3 === 1 ? "aspect-[9/14.5]" : "aspect-[9/18]";
          return <div key={i} className={`skeleton w-full ${aspect} rounded-[24px]`} />;
        })}
      </div>
    </div>
  );
}

function IncrementalSkeleton() {
  return (
    <div className="flex gap-3 items-start mt-3" aria-hidden="true">
      <div className="flex-1 flex flex-col gap-3">
        <div className="skeleton w-full aspect-[9/16] rounded-[24px]" />
        <div className="skeleton w-full aspect-[9/14.5] rounded-[24px]" />
      </div>
      <div className="flex-1 flex flex-col gap-3">
        <div className="skeleton w-full aspect-[9/14.5] rounded-[24px]" />
        <div className="skeleton w-full aspect-[9/16] rounded-[24px]" />
      </div>
    </div>
  );
}

function FeedErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-4xl">⚠️</p>
      <p className="mt-3 font-bold text-foreground">Algo deu errado por aqui</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Não conseguimos carregar o feed agora.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-soft active:scale-95 transition-transform disabled:opacity-60"
      >
        {retrying ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCcw className="h-3.5 w-3.5" />
        )}
        Tentar novamente
      </button>
    </div>
  );
}
