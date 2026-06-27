import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { X, Heart, Copy, Check, ExternalLink, Lock, Tag } from "lucide-react";
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
    // Affiliate redirect placeholder — wired to real affiliate links later.
    onClose();
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-card pb-[env(safe-area-inset-bottom)] sm:rounded-[28px]"
          >
            <div className="sticky top-0 z-20 flex justify-center pt-2.5">
              <span className="h-1.5 w-12 rounded-full bg-border" />
            </div>

            <div className="relative">
              <div className="relative mx-auto mt-2 aspect-[9/16] max-h-[52vh] w-[calc(100%-2rem)] overflow-hidden rounded-3xl bg-muted">
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1.5 text-sm font-extrabold text-primary-foreground shadow-glow">
                  -{savingsPercent(product)}%
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur active:scale-90"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={() => toggle(product.id)}
                  aria-label="Favoritar"
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 backdrop-blur active:scale-90"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isFavorite(product.id)
                        ? "fill-primary text-primary"
                        : "text-foreground"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-5 pt-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                  {product.marketplace}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {product.brand}
                </span>
              </div>

              <h2 className="mt-2.5 text-lg font-extrabold leading-snug text-foreground">
                {product.title}
              </h2>

              <div className="mt-3 flex items-end gap-3">
                <span className="text-3xl font-extrabold text-foreground">
                  {formatBRL(product.price)}
                </span>
                <span className="pb-1 text-sm text-muted-foreground line-through">
                  {formatBRL(product.oldPrice)}
                </span>
                <span className="mb-1 ml-auto rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                  Economize {formatBRL(product.oldPrice - product.price)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              {product.coupon && (
                <button
                  onClick={copyCoupon}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-accent/60 p-3 text-left active:scale-[0.99]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                    <Tag className="h-4 w-4 text-primary" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[11px] font-medium text-muted-foreground">
                      Cupom exclusivo
                    </span>
                    <span className="block text-base font-extrabold tracking-wide text-foreground">
                      {product.coupon}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-primary">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copiar
                      </>
                    )}
                  </span>
                </button>
              )}
            </div>

            <div className="sticky bottom-0 mt-5 space-y-2.5 border-t border-border bg-card/95 p-4 backdrop-blur">
              <button
                onClick={() => openOffer(product)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-base font-bold text-primary-foreground shadow-glow active:scale-[0.98]"
              >
                <ExternalLink className="h-5 w-5" /> Ver Oferta
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate({ to: "/vip" });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground active:scale-[0.98]"
              >
                <Lock className="h-4 w-4 text-primary" /> Entrar para o Clube VIP
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
