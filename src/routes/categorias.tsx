import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as Icons from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { OfferModal } from "@/components/OfferModal";
import {
  CATEGORIES,
  PRODUCTS,
  type CategoryId,
  type Product,
} from "@/lib/products";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — Clube Secreto de Achadinhos" },
      {
        name: "description",
        content:
          "Explore achadinhos por categoria: fraldas, roupas, brinquedos, carrinhos e muito mais.",
      },
    ],
  }),
  component: CategoriesPage,
});

function count(id: CategoryId) {
  return id === "tudo"
    ? PRODUCTS.length
    : PRODUCTS.filter((p) => p.category === id).length;
}

function CategoriesPage() {
  const [selected, setSelected] = useState<CategoryId | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const list = selected
    ? PRODUCTS.filter((p) => p.category === selected)
    : [];
  const selectedLabel = CATEGORIES.find((c) => c.id === selected)?.label;

  return (
    <AppShell>
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-background/85 px-4 py-4 backdrop-blur-xl">
        {selected && (
          <button
            onClick={() => setSelected(null)}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-extrabold text-foreground">
            {selected ? selectedLabel : "Categorias"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {selected
              ? `${list.length} achadinhos`
              : "Escolha o que você procura"}
          </p>
        </div>
      </header>

      <main className="px-4">
        {!selected ? (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.filter((c) => c.id !== "tudo").map((cat) => {
              const Icon = (Icons[cat.icon as keyof typeof Icons] ||
                Icons.Tag) as React.ComponentType<{ className?: string }>;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelected(cat.id)}
                  className="bg-gradient-warm flex flex-col items-start gap-3 rounded-3xl border border-border p-4 text-left shadow-card active:scale-[0.98]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-extrabold text-foreground">
                      {cat.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {count(cat.id)} ofertas
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="columns-2 gap-3 pt-1">
            {list.map((p) => (
              <div key={p.id} style={{ breakInside: "avoid" }}>
                <ProductCard product={p} onOpen={setProduct} />
              </div>
            ))}
          </div>
        )}
      </main>

      <OfferModal product={product} onClose={() => setProduct(null)} />
    </AppShell>
  );
}
