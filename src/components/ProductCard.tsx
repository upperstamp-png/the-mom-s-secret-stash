import { Heart, Flame, Lock } from "lucide-react";
import { motion } from "motion/react";
import {
  type Product,
  formatBRL,
  savingsPercent,
} from "@/lib/products";
import { useFavorites, trackEvent } from "@/lib/store";

interface ProductCardProps {
  product: Product;
  onOpen: (p: Product) => void;
  priority?: boolean;
}

export function ProductCard({ product, onOpen, priority }: ProductCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const saving = savingsPercent(product);

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        trackEvent({ productId: product.id, type: "view" });
        onOpen(product);
      }}
      className="group relative mb-3 block w-full overflow-hidden rounded-3xl bg-card text-left shadow-card"
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.title}
          loading={priority ? "eager" : "lazy"}
          width={768}
          height={1344}
          className="h-full w-full object-cover transition-transform duration-500 group-active:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/5" />

        {/* top badges */}
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground shadow-glow">
              -{saving}%
            </span>
            {product.hot && (
              <span className="flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-[11px] font-bold text-primary backdrop-blur">
                <Flame className="h-3 w-3" /> Em alta
              </span>
            )}
            {product.vipOnly && (
              <span className="flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[11px] font-bold text-background backdrop-blur">
                <Lock className="h-3 w-3" /> VIP
              </span>
            )}
          </div>
          <span
            role="button"
            tabIndex={0}
            aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            onClick={(e) => {
              e.stopPropagation();
              toggle(product.id);
              trackEvent({ productId: product.id, type: "favorite" });
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur transition-transform active:scale-90"
          >
            <Heart
              className={`h-[18px] w-[18px] transition-colors ${
                fav ? "fill-primary text-primary" : "text-foreground"
              }`}
            />
          </span>
        </div>

        {/* bottom text on image */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white drop-shadow">
            {product.title}
          </p>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[17px] font-extrabold leading-none text-foreground">
              {formatBRL(product.price)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground line-through">
              {formatBRL(product.oldPrice)}
            </p>
          </div>
          <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-bold text-accent-foreground">
            {product.marketplace}
          </span>
        </div>

        <div className="mt-3 w-full rounded-2xl bg-gradient-primary py-2.5 text-center text-sm font-bold text-primary-foreground shadow-glow">
          Ver Oferta
        </div>
      </div>
    </motion.button>
  );
}
