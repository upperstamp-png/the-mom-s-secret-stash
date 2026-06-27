import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ArrowRight, Sparkles } from "lucide-react";
import { useProfile, useHydrated } from "@/lib/store";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Clube Secreto de Achadinhos" },
      {
        name: "description",
        content: "Entre no clube privado das mamães e descubra ofertas exclusivas.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const { profile, update } = useProfile();
  const [emailMode, setEmailMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (hydrated && profile.loggedIn) {
      navigate({ to: profile.onboarded ? "/" : "/onboarding", replace: true });
    }
  }, [hydrated, profile.loggedIn, profile.onboarded, navigate]);

  const finishLogin = (data: { name: string; email: string }) => {
    update({ loggedIn: true, name: data.name, email: data.email });
    navigate({ to: profile.onboarded ? "/" : "/onboarding", replace: true });
  };

  return (
    <div className="bg-gradient-warm relative mx-auto flex min-h-screen max-w-md flex-col justify-between overflow-hidden px-6 pb-8 pt-16">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative">
        <img
          src={logo}
          alt="Clube Secreto"
          width={84}
          height={84}
          className="h-20 w-20 rounded-3xl shadow-float"
        />
        <span className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-soft">
          <Sparkles className="h-3.5 w-3.5" /> Clube privado de mamães
        </span>
        <h1 className="mt-4 text-[34px] font-extrabold leading-[1.05] text-foreground">
          Achadinhos
          <br />
          <span className="text-gradient-primary">secretos</span> pra você.
        </h1>
        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          Entre no clube onde só algumas mães encontram as melhores ofertas —
          antes de todo mundo.
        </p>
      </div>

      <div className="relative mt-8 space-y-3">
        {!emailMode ? (
          <>
            <button
              onClick={() =>
                finishLogin({ name: "Mamãe", email: "google@clube.app" })
              }
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-card py-4 text-[15px] font-bold text-foreground shadow-card active:scale-[0.98]"
            >
              <GoogleIcon /> Continuar com Google
            </button>
            <button
              onClick={() =>
                finishLogin({ name: "Mamãe", email: "apple@clube.app" })
              }
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground py-4 text-[15px] font-bold text-background active:scale-[0.98]"
            >
              <AppleIcon /> Continuar com Apple
            </button>
            <button
              onClick={() => setEmailMode(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-[15px] font-bold text-foreground active:scale-[0.98]"
            >
              <Mail className="h-5 w-5 text-primary" /> Continuar com Email
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              finishLogin({
                name: name.trim() || "Mamãe",
                email: email.trim(),
              });
            }}
            className="space-y-3 rounded-3xl bg-card p-4 shadow-card"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-medium outline-none focus:border-primary"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="Seu melhor email"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-medium outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-[15px] font-bold text-primary-foreground shadow-glow active:scale-[0.98]"
            >
              Entrar <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setEmailMode(false)}
              className="w-full py-1 text-center text-sm font-semibold text-muted-foreground"
            >
              Voltar
            </button>
          </form>
        )}

        <p className="px-2 pt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          Ao entrar, você concorda com os Termos e a Política de Privacidade do
          Clube. Cadastro em menos de 30 segundos.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.55 2.05-1.11.02-1.47-.66-2.75-.66-1.27 0-1.67.64-2.73.68-1.09.04-1.93-1.1-2.63-2.11-1.42-2.07-2.51-5.85-1.05-8.41.72-1.27 2.02-2.07 3.43-2.09 1.08-.02 2.09.72 2.75.72.66 0 1.89-.89 3.18-.76.54.02 2.06.22 3.04 1.65-.08.05-1.81 1.06-1.79 3.16M14.3 4.6c.59-.71.98-1.7.87-2.7-.85.04-1.87.57-2.48 1.28-.55.63-1.02 1.64-.89 2.6.94.08 1.91-.48 2.5-1.18" />
    </svg>
  );
}
