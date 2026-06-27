import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Crown,
  Baby,
  Heart,
  Clock,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Plus,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useProfile, useFavorites } from "@/lib/store";
import { CATEGORIES } from "@/lib/products";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Clube Secreto de Achadinhos" },
      {
        name: "description",
        content: "Gerencie seus filhos, interesses e preferências do Clube.",
      },
    ],
  }),
  component: ProfilePage,
});

function ageLabel(months: number) {
  if (months < 1) return "Recém-nascido";
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}

function ProfilePage() {
  const navigate = useNavigate();
  const { profile, update, reset } = useProfile();
  const { favorites } = useFavorites();

  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");

  useEffect(() => {
    setNewName(profile.name || "");
    setNewAvatar(profile.avatarUrl || "");
    setNewCity(profile.city || "");
    setNewState(profile.state || "");
  }, [profile]);

  const interestLabels = profile.interests
    .map((id) => CATEGORIES.find((c) => c.id === id)?.label)
    .filter(Boolean);

  const logout = () => {
    reset();
    navigate({ to: "/auth", replace: true });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    update({
      name: newName.trim(),
      avatarUrl: newAvatar.trim(),
      city: newCity.trim(),
      state: newState.trim(),
    });
    setEditOpen(false);
    toast.success("Perfil atualizado com sucesso! ✨");
  };

  return (
    <AppShell>
      <header className="px-4 pb-2 pt-5">
        <h1 className="text-2xl font-extrabold text-foreground">Perfil</h1>
      </header>

      <main className="space-y-5 px-4">
        {/* Identity */}
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-card">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover shadow-float"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-2xl font-extrabold text-primary-foreground shadow-glow">
              {(profile.name || "M").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold text-foreground">
              {profile.name || "Mamãe"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {profile.email || "—"}
            </p>
            {(profile.city || profile.state) && (
              <p className="mt-0.5 truncate text-xs font-semibold text-primary">
                📍 {profile.city} {profile.state ? `· ${profile.state}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-soft active:scale-90"
            aria-label="Editar Perfil"
          >
            <Pencil className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* VIP banner */}
        {profile.vip ? (
          <div className="bg-gradient-vip flex items-center gap-3 rounded-3xl p-4 text-secondary shadow-float">
            <Crown className="h-7 w-7" />
            <div>
              <p className="font-extrabold text-background">Membro VIP 🧡</p>
              <p className="text-xs text-secondary/90">
                Você recebe as ofertas escondidas em primeira mão.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate({ to: "/vip" })}
            className="bg-gradient-vip flex w-full items-center gap-3 rounded-3xl p-4 text-left shadow-float active:scale-[0.99]"
          >
            <Crown className="h-7 w-7 text-secondary" />
            <div className="flex-1">
              <p className="font-extrabold text-background">Seja VIP</p>
              <p className="text-xs text-secondary/90">
                Ofertas antecipadas por R$ 9,99/mês
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-secondary" />
          </button>
        )}

        {/* Children */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 font-extrabold text-foreground">
              <Baby className="h-5 w-5 text-primary" /> Meus filhos
            </p>
            <button
              onClick={() => navigate({ to: "/onboarding" })}
              className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          </div>
          {profile.children.length === 0 ? (
            <button
              onClick={() => navigate({ to: "/onboarding" })}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground"
            >
              <Plus className="h-4 w-4" /> Adicionar filho
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.children.map((c) => (
                <span
                  key={c.id}
                  className="rounded-2xl bg-muted px-3 py-2 text-sm font-semibold text-foreground"
                >
                  {c.name || "Bebê"} · {ageLabel(c.ageMonths)}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Interests */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-extrabold text-foreground">Meus interesses</p>
            <button
              onClick={() => navigate({ to: "/onboarding" })}
              className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestLabels.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Nenhum interesse selecionado.
              </span>
            ) : (
              interestLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
                >
                  {label}
                </span>
              ))
            )}
          </div>
        </section>

        {/* Quick rows */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          {[
            {
              icon: Heart,
              label: "Favoritos",
              hint: `${favorites.length}`,
              onClick: () => navigate({ to: "/favoritos" }),
            },
            {
              icon: Clock,
              label: "Histórico",
              hint: "",
              onClick: () => toast("Histórico em breve ⏳"),
            },
            {
              icon: Bell,
              label: "Notificações",
              hint: "",
              onClick: () => toast("Configurações de push em breve 🔔"),
            },
            {
              icon: Settings,
              label: "Configurações",
              hint: "",
              onClick: () => toast("Configurações em breve ⚙️"),
            },
          ].map((row, i) => (
            <button
              key={row.label}
              onClick={row.onClick}
              className={`flex w-full items-center gap-3 px-4 py-3.5 active:bg-muted ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                <row.icon className="h-[18px] w-[18px] text-primary" />
              </span>
              <span className="flex-1 text-left text-sm font-semibold text-foreground">
                {row.label}
              </span>
              {row.hint && (
                <span className="text-sm font-bold text-muted-foreground">
                  {row.hint}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </section>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-destructive active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
              onClick={() => setEditOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="relative z-10 w-full max-w-md rounded-t-[28px] bg-card p-6 pb-[env(safe-area-inset-bottom)] sm:rounded-[28px]"
            >
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-lg font-extrabold text-foreground">
                  Editar Cadastro
                </h2>
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">
                    Nome Completo
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    placeholder="Seu nome"
                    className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground">
                    URL da Foto (Avatar)
                  </label>
                  <input
                    value={newAvatar}
                    onChange={(e) => setNewAvatar(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      Cidade
                    </label>
                    <input
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">
                      Estado
                    </label>
                    <input
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      placeholder="Ex: SP"
                      maxLength={2}
                      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-base font-bold text-primary-foreground shadow-glow active:scale-[0.98]"
                >
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

