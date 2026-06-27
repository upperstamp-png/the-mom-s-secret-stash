import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { X, Heart, ExternalLink, Lock, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  type Product,
  formatBRL,
  savingsPercent,
} from "@/lib/products";
import { useFavorites, trackEvent } from "@/lib/store";

interface OfferModalProps {
  product: Product | null;
  onClose: () => void;
}

export function OfferModal({ product, onClose }: OfferModalProps) {
  const navigate = useNavigate();
  const { isFavorite, toggle } = useFavorites();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [product]);

  const copyCoupon = () => {
    if (!product?.coupon) return;
    navigator.clipboard?.writeText(product.coupon);
    setCopied(true);
    toast.success("Cupom copiado!");
    setTimeout(() => setCopied(false), 1800);
  };

  const openOffer = (p: Product) => {
    trackEvent({ productId: p.id, type: "offer_click" });
    toast.success("Abrindo oferta no " + p.marketplace + " ✨");
    onClose();
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Close Backdrop click */}
          <div
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* Swipeable Story Container */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 140) {
                onClose();
              }
            }}
            initial={{ y: "100%", scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="relative z-10 h-full max-h-[94vh] w-full max-w-md overflow-hidden rounded-[32px] bg-black text-white shadow-2xl active:cursor-grabbing"
          >
            {/* Story Background Hero */}
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
              {product.video ? (
                <video
                  src={product.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* Gradient Overlay for story text readability */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, rgba(0,0,0,0.9) 85%)",
              }}
            />

            {/* Drag Bar Indicator */}
            <div className="absolute top-3 inset-x-0 z-30 flex flex-col items-center pointer-events-none">
              <span className="h-1.5 w-10 rounded-full bg-white/30" />
              <span className="text-[8px] font-bold text-white/40 mt-1 uppercase tracking-widest leading-none">
                Deslize para fechar
              </span>
            </div>

            {/* Floating Top Nav (Controls) */}
            <div className="absolute inset-x-4 top-10 z-30 flex justify-between items-center">
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/10 active:scale-90 transition-transform cursor-pointer"
              >
                <X className="h-5 w-5 text-white" />
              </button>

              <div className="flex gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-black text-white shadow-glow">
                  -{savingsPercent(product)}%
                </span>
                <button
                  onClick={() => toggle(product.id)}
                  aria-label="Favoritar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/10 active:scale-90 transition-transform cursor-pointer"
                >
                  <Heart
                    className={`h-4.5 w-4.5 ${
                      isFavorite(product.id)
                        ? "fill-primary text-primary"
                        : "text-white"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="absolute inset-x-5 bottom-8 z-20 flex flex-col gap-3">
              {/* Brand and Marketplace */}
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[9px] font-extrabold text-foreground shadow-sm">
                  {product.marketplace}
                </span>
                {product.brand && (
                  <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">
                    {product.brand}
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h2 className="text-base font-extrabold leading-tight text-white">
                {product.title}
              </h2>

              {/* Prices */}
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-black text-white">
                  {formatBRL(product.price)}
                </span>
                <span className="text-sm text-white/50 line-through">
                  {formatBRL(product.oldPrice)}
                </span>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                  Economize {formatBRL(product.oldPrice - product.price)}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-xs leading-relaxed text-white/70 line-clamp-2">
                  {product.description}
                </p>
              )}

              {/* Coupon Option */}
              {product.coupon && (
                <button
                  onClick={copyCoupon}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/10 p-2.5 text-left active:scale-[0.98] transition-transform"
                >
                  <Tag className="h-4 w-4 text-secondary" />
                  <div className="flex-grow">
                    <span className="block text-[8px] font-bold text-white/50 uppercase leading-none">
                      Cupom Disponível
                    </span>
                    <span className="block text-sm font-extrabold tracking-wide text-white leading-none mt-1">
                      {product.coupon}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-secondary mr-1">
                    {copied ? "Copiado!" : "Copiar"}
                  </span>
                </button>
              )}

              {/* CTA Buttons */}
              <div className="pt-1.5 space-y-2">
                <button
                  onClick={() => openOffer(product)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary/95 hover:bg-primary py-3.5 text-sm font-black text-white shadow-glow active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <ExternalLink className="h-4.5 w-4.5" /> VER OFERTA
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate({ to: "/vip" });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/15 py-3 text-xs font-black text-white backdrop-blur-sm border border-white/10 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5 text-secondary" /> ENTRAR NO CLUBE VIP
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
