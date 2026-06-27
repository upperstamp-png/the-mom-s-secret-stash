import { Heart } from "lucide-react";
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
  index?: number;
}

export function ProductCard({ product, onOpen, priority, index = 0 }: ProductCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const saving = savingsPercent(product);

  // Strictly 9:16 vertical aspect ratio for all cards
  const aspectClass = "aspect-[9/16]";

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        trackEvent({ productId: product.id, type: "view" });
        onOpen(product);
      }}
      className="group relative mb-3 block w-full overflow-hidden rounded-[24px] bg-card text-left border border-border/5 shadow-none"
    >
      <div className={`relative ${aspectClass} w-full overflow-hidden`}>
        {/* Video / Image Render */}
        {product.video ? (
          <video
            src={product.video}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.01]"
          />
        ) : (
          <img
            src={product.image}
            alt={product.title}
            loading={priority ? "eager" : "lazy"}
            width={768}
            height={1344}
            className="h-full w-full object-cover transition-transform duration-500 group-active:scale-[1.01]"
          />
        )}

        {/* Gradient Overlay for Text Readability (Transparent to 70% Black) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.7) 100%)",
          }}
        />

        {/* Top Badges (Left) */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1 max-w-[70%]">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground shadow-sm">
            -{saving}%
          </span>
          {product.hot && (
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold text-secondary backdrop-blur-md border border-white/5">
              🔥 Oferta
            </span>
          )}
          {product.vipOnly && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm">
              ⭐ VIP
            </span>
          )}
        </div>

        {/* Translucent Favoritar button with custom bounce animation on click (Right) */}
        <motion.button
          whileTap={{ scale: 1.35 }}
          transition={{ type: "spring", stiffness: 400, damping: 11 }}
          role="button"
          aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={(e) => {
            e.stopPropagation();
            toggle(product.id);
            trackEvent({ productId: product.id, type: "favorite" });
          }}
          className="absolute right-2.5 top-2.5 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-white/25 backdrop-blur-md border border-white/10 shadow-soft transition-all"
        >
          <Heart
            className={`h-4.5 w-4.5 transition-colors ${
              fav ? "fill-primary text-primary" : "text-white"
            }`}
          />
        </motion.button>

        {/* Bottom Content Container */}
        <div className="absolute inset-x-3 bottom-3 flex flex-col justify-end">
          {/* Brand and Marketplace */}
          <p className="text-[10px] font-bold text-white/70 leading-none truncate">
            {product.brand} · <span className="text-secondary">{product.marketplace}</span>
          </p>

          {/* Product Title */}
          <h3 className="line-clamp-2 text-xs font-bold leading-tight text-white mt-1">
            {product.title}
          </h3>

          {/* Prices */}
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[16px] font-black text-white leading-none">
              {formatBRL(product.price)}
            </span>
            <span className="text-[10px] text-white/45 line-through leading-none">
              {formatBRL(product.oldPrice)}
            </span>
          </div>

          {/* Overlaid Floating Button: Pill Rounded (999px), Slightly Transparent Orange, Soft Shadow */}
          <div className="mt-2.5 w-full rounded-full bg-primary/90 text-center text-xs font-black text-primary-foreground py-2.5 shadow-sm active:scale-95 transition-transform">
            VER OFERTA
          </div>
        </div>
      </div>
    </motion.button>
  );
}
