import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Plus, Trash2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useProfile, useHydrated, type Child } from "@/lib/store";
import { CATEGORIES, type CategoryId } from "@/lib/products";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Vamos te conhecer — Clube Secreto" },
      { name: "description", content: "Personalize seus achadinhos em segundos." },
    ],
  }),
  component: OnboardingPage,
});

const AGE_OPTIONS: { label: string; months: number }[] = [
  { label: "0–6m", months: 3 },
  { label: "6–12m", months: 9 },
  { label: "1 ano", months: 12 },
  { label: "2 anos", months: 24 },
  { label: "3 anos", months: 36 },
  { label: "4 anos", months: 48 },
  { label: "5+ anos", months: 60 },
];

let cid = 0;
const newChild = (): Child => ({
  id: `c${Date.now()}-${cid++}`,
  name: "",
  ageMonths: 12,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const { profile, update } = useProfile();

  const [step, setStep] = useState(0);
  const [children, setChildren] = useState<Child[]>([]);
  const [interests, setInterests] = useState<CategoryId[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.loggedIn) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    setChildren(profile.children.length ? profile.children : [newChild()]);
    setInterests(profile.interests as CategoryId[]);
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleInterest = (id: CategoryId) =>
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const finish = () => {
    update({
      children: children.filter((c) => c.ageMonths >= 0),
      interests,
      onboarded: true,
    });
    navigate({ to: "/", replace: true });
  };

  const canNext = step === 0 ? children.length > 0 : interests.length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-8 pt-12">
      {/* progress */}
      <div className="flex items-center gap-2">
        {[0, 1].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="mt-8 flex-1">
        {step === 0 ? (
          <>
            <h1 className="text-[28px] font-extrabold leading-tight text-foreground">
              Quantos filhos
              <br />
              você tem? 👶
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Conte pra gente a idade de cada um para personalizar suas ofertas.
            </p>

            <div className="mt-6 space-y-3">
              {children.map((child, idx) => (
                <div
                  key={child.id}
                  className="rounded-3xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={child.name}
                      onChange={(e) =>
                        setChildren((prev) =>
                          prev.map((c) =>
                            c.id === child.id
                              ? { ...c, name: e.target.value }
                              : c,
                          ),
                        )
                      }
                      placeholder={`Filho(a) ${idx + 1}`}
                      className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none focus:border-primary"
                    />
                    {children.length > 1 && (
                      <button
                        onClick={() =>
                          setChildren((prev) =>
                            prev.filter((c) => c.id !== child.id),
                          )
                        }
                        aria-label="Remover"
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground active:scale-90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                    {AGE_OPTIONS.map((opt) => {
                      const sel = child.ageMonths === opt.months;
                      return (
                        <button
                          key={opt.label}
                          onClick={() =>
                            setChildren((prev) =>
                              prev.map((c) =>
                                c.id === child.id
                                  ? { ...c, ageMonths: opt.months }
                                  : c,
                              ),
                            )
                          }
                          className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all active:scale-95 ${
                            sel
                              ? "bg-gradient-primary text-primary-foreground shadow-glow"
                              : "border border-border bg-background text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={() => setChildren((prev) => [...prev, newChild()])}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3.5 text-sm font-bold text-muted-foreground active:scale-[0.99]"
              >
                <Plus className="h-4 w-4" /> Adicionar outro filho
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-extrabold leading-tight text-foreground">
              O que você
              <br />
              procura hoje? 🧡
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha quantas categorias quiser. Você pode mudar depois.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {CATEGORIES.filter((c) => c.id !== "tudo").map((cat) => {
                const Icon = (Icons[cat.icon as keyof typeof Icons] ||
                  Icons.Tag) as React.ComponentType<{ className?: string }>;
                const sel = interests.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleInterest(cat.id)}
                    className={`relative flex flex-col items-start gap-3 rounded-3xl border p-4 text-left transition-all active:scale-[0.98] ${
                      sel
                        ? "border-primary bg-accent shadow-glow"
                        : "border-border bg-card"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        sel
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {cat.label}
                    </span>
                    {sel && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* nav */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(0)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <button
          disabled={!canNext}
          onClick={() => (step === 0 ? setStep(1) : finish())}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-base font-extrabold text-primary-foreground shadow-glow transition active:scale-[0.98] disabled:opacity-40"
        >
          {step === 0 ? (
            <>
              Continuar <ArrowRight className="h-5 w-5" />
            </>
          ) : (
            <>
              Entrar no Clube <Check className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
