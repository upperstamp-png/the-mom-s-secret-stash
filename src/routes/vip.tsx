import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Crown,
  ChevronLeft,
  Check,
  Lock,
  Zap,
  Gift,
  Bell,
  Users,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/lib/store";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "Clube VIP — Ofertas escondidas antes de todo mundo" },
      {
        name: "description",
        content:
          "Por R$ 9,99/mês receba ofertas antecipadas, cupons exclusivos e acesso ao grupo VIP no WhatsApp.",
      },
    ],
  }),
  component: VipPage,
});

const BENEFITS = [
  { icon: Users, title: "Grupo privado", desc: "Comunidade só de membros VIP" },
  {
    icon: Zap,
    title: "Promoções antecipadas",
    desc: "Veja as ofertas antes de todo mundo",
  },
  { icon: Gift, title: "Cupons exclusivos", desc: "Descontos só para VIPs" },
  {
    icon: Lock,
    title: "Produtos limitados",
    desc: "Achadinhos raros e em pouca quantidade",
  },
  {
    icon: Bell,
    title: "Alertas instantâneos",
    desc: "Avisamos no segundo que a oferta sai",
  },
];

function VipPage() {
  const navigate = useNavigate();
  const { profile, update } = useProfile();
  const [processing, setProcessing] = useState(false);

  const subscribe = () => {
    // Placeholder for Stripe / Mercado Pago checkout.
    // After confirmed payment, the backend will unlock VIP and reveal the
    // WhatsApp group link automatically.
    setProcessing(true);
    setTimeout(() => {
      update({ vip: true });
      setProcessing(false);
      toast.success("Bem-vinda ao Clube VIP! 🧡");
    }, 1200);
  };

  if (profile.vip) {
    return (
      <AppShell>
        <VipHeader onBack={() => navigate({ to: "/" })} />
        <main className="px-4">
          <div className="bg-gradient-vip mt-2 rounded-3xl p-6 text-center shadow-float">
            <Crown className="mx-auto h-12 w-12 text-secondary" />
            <h1 className="mt-3 text-2xl font-extrabold text-background">
              Você é VIP! 🧡
            </h1>
            <p className="mt-2 text-sm text-secondary/90">
              Entre no grupo exclusivo e receba os achadinhos secretos em
              primeira mão.
            </p>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-3.5 text-base font-bold text-success-foreground active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" /> Entrar no grupo VIP
            </a>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <VipHeader onBack={() => navigate({ to: "/" })} />
      <main className="px-4 pb-4">
        {/* Hero */}
        <div className="bg-gradient-vip relative overflow-hidden rounded-3xl p-6 shadow-float">
          <Crown className="absolute -right-4 -top-4 h-28 w-28 text-secondary/15" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-xs font-bold text-secondary">
            <Crown className="h-3.5 w-3.5" /> Clube VIP
          </span>
          <h1 className="mt-3 text-[26px] font-extrabold leading-tight text-background">
            Receba ofertas escondidas antes de todo mundo.
          </h1>
          <p className="mt-2 text-sm text-secondary/90">
            As melhores promoções somem rápido. Membros VIP veem primeiro.
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-5 space-y-2.5">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <b.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-foreground">
                  {b.title}
                </p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
              <Check className="h-5 w-5 text-success" />
            </div>
          ))}
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 z-30 border-t border-border bg-card/95 p-4 backdrop-blur">
        <div className="mb-2 flex items-end justify-center gap-1">
          <span className="text-3xl font-extrabold text-foreground">
            R$ 9,99
          </span>
          <span className="pb-1 text-sm font-medium text-muted-foreground">
            /mês
          </span>
        </div>
        <button
          onClick={subscribe}
          disabled={processing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 text-base font-extrabold text-primary-foreground shadow-glow active:scale-[0.98] disabled:opacity-70"
        >
          {processing ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
          ) : (
            <>
              <Crown className="h-5 w-5" /> Quero ser VIP
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Cancele quando quiser · Acesso imediato ao grupo
        </p>
      </div>
    </AppShell>
  );
}

function VipHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 px-4 py-4">
      <button
        onClick={onBack}
        aria-label="Voltar"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft active:scale-90"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="font-extrabold text-foreground">Clube VIP</h2>
    </header>
  );
}
