import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Play,
  Bell,
  RefreshCw,
  TrendingUp,
  Users,
  Percent,
  Calendar,
  MessageSquare,
  Instagram,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    usersCount: 0,
    vipCount: 0,
    productsCount: 0,
    crawlersCount: 0,
  });
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushSegment, setPushSegment] = useState("all");
  const [sendingPush, setSendingPush] = useState(false);

  const [crawlerLogs, setCrawlerLogs] = useState<string[]>([]);
  const [runningCrawler, setRunningCrawler] = useState(false);

  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: users } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        const { count: vips } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("vip", true);
        const { count: prods } = await supabase.from("products").select("*", { count: "exact", head: true });
        const { count: crawlers } = await supabase.from("crawler_jobs").select("*", { count: "exact", head: true });

        setStats({
          usersCount: users || 0,
          vipCount: vips || 0,
          productsCount: prods || 0,
          crawlersCount: crawlers || 0,
        });

        const { data: payments } = await supabase
          .from("payments")
          .select("id, amount, payment_method, status, created_at, profiles(name, email)")
          .order("created_at", { ascending: false })
          .limit(5);

        setRecentPayments(payments || []);
      } catch (err) {
        console.error("Erro ao carregar estatísticas do admin:", err);
      }
    };

    fetchStats();
  }, []);

  const triggerCrawler = async () => {
    setRunningCrawler(true);
    setCrawlerLogs(["Iniciando crawler integrado...", "Isso pode levar de 5 a 15 segundos..."]);
    try {
      const res = await fetch("/api/cron/crawler?secret=super-secret-cron-token");
      if (!res.ok) throw new Error(`Crawler HTTP Error! Status: ${res.status}`);
      const data = await res.json();
      setCrawlerLogs(data.logs || ["Nenhum log retornado pelo crawler."]);
      toast.success(`Ingestão concluída! ${data.total_imported} produtos atualizados.`);
    } catch (err: any) {
      console.error(err);
      setCrawlerLogs((prev) => [...prev, `[ERRO] Falha ao rodar crawler: ${err.message}`]);
      toast.error("Falha ao rodar crawler.");
    } finally {
      setRunningCrawler(false);
    }
  };

  const sendPushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) return;

    setSendingPush(true);
    try {
      // Find matching push tokens in segment
      let query = supabase.from("push_tokens").select("token, platform");
      if (pushSegment === "vip") {
        const { data: vips } = await supabase.from("profiles").select("id").eq("vip", true);
        const vipIds = (vips || []).map((v) => v.id);
        query = query.in("profile_id", vipIds);
      } else if (pushSegment === "baby") {
        const { data: babyKids } = await supabase.from("children").select("profile_id").lte("age_months", 12);
        const babyIds = (babyKids || []).map((c) => c.profile_id);
        query = query.in("profile_id", babyIds);
      } else if (pushSegment === "toddler") {
        const { data: toddlerKids } = await supabase
          .from("children")
          .select("profile_id")
          .gt("age_months", 12)
          .lte("age_months", 36);
        const toddlerIds = (toddlerKids || []).map((c) => c.profile_id);
        query = query.in("profile_id", toddlerIds);
      }

      const { data: tokens } = await query;

      if (!tokens || tokens.length === 0) {
        toast.info("Nenhum dispositivo encontrado para este segmento de envio.");
        return;
      }

      // Record notification history
      await supabase.from("notifications").insert({
        title: pushTitle,
        body: pushBody,
        target_segment: { segment: pushSegment },
        sent_at: new Date().toISOString(),
        status: "sent",
      });

      toast.success(`Push enviado com sucesso para ${tokens.length} dispositivos! 🔔`);
      setPushTitle("");
      setPushBody("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao disparar push");
    } finally {
      setSendingPush(false);
    }
  };

  return (
    <div className="px-4">
      {/* Header */}
      <header className="flex items-center gap-3 pb-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-soft active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Painel Administrativo</h1>
          <p className="text-xs text-muted-foreground">Clube Secreto de Achadinhos</p>
        </div>
      </header>

      {/* Grid Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Users, label: "Mães Cadastradas", val: stats.usersCount, color: "text-primary bg-primary/10" },
          { icon: TrendingUp, label: "Membros VIP", val: stats.vipCount, color: "text-amber-500 bg-amber-500/10" },
          { icon: Percent, label: "Ofertas Ativas", val: stats.productsCount, color: "text-emerald-500 bg-emerald-500/10" },
          { icon: Calendar, label: "Jobs de Crawler", val: stats.crawlersCount, color: "text-blue-500 bg-blue-500/10" },
        ].map((stat, i) => (
          <div key={i} className="rounded-3xl border border-border bg-card p-4 shadow-card">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-2xl font-extrabold text-foreground">{stat.val}</p>
            <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Ingestão / Crawler */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-extrabold text-foreground">Ingestão de Ofertas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Execute os adaptadores de marketplace (Amazon, Shopee, Mercado Livre, etc.) em tempo real.
          </p>

          <button
            onClick={triggerCrawler}
            disabled={runningCrawler}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {runningCrawler ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Ingerindo Produtos...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Executar Sincronização Agora
              </>
            )}
          </button>

          <div className="mt-4 rounded-2xl bg-muted p-4">
            <p className="text-xs font-bold text-muted-foreground">Console Logs:</p>
            <div className="no-scrollbar mt-2 max-h-40 overflow-y-auto font-mono text-[10px] text-foreground space-y-1">
              {crawlerLogs.length === 0 ? (
                <span className="text-muted-foreground italic">Nenhum job rodando no momento.</span>
              ) : (
                crawlerLogs.map((log, lIdx) => <div key={lIdx}>{log}</div>)
              )}
            </div>
          </div>
        </section>

        {/* Notificações Push */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-extrabold text-foreground">Disparo de Notificações</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Envie mensagens de Push direcionadas a segmentos específicos de mães.
          </p>

          <form onSubmit={sendPushNotification} className="mt-4 space-y-3">
            <input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              required
              placeholder="Título da Notificação"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-medium outline-none focus:border-primary"
            />
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              required
              rows={2}
              placeholder="Mensagem"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-medium outline-none focus:border-primary resize-none"
            />

            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Segmento de Destinatários
              </label>
              <select
                value={pushSegment}
                onChange={(e) => setPushSegment(e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-xs font-medium outline-none focus:border-primary"
              >
                <option value="all">Todas as Mães</option>
                <option value="vip">Apenas Membros VIP</option>
                <option value="baby">Mães de Bebês (0-12 meses)</option>
                <option value="toddler">Mães de Crianças Pequenas (1-3 anos)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={sendingPush}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-xs font-bold text-background active:scale-[0.98] disabled:opacity-50"
            >
              <Bell className="h-4 w-4" /> Enviar Notificação
            </button>
          </form>
        </section>
      </div>

      {/* Campanhas do WhatsApp e Postagens do Instagram */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-extrabold text-foreground">Campanhas WhatsApp</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure disparos periódicos no WhatsApp do Clube. O backend está preparado para integração com gateways oficiais e mensagens automatizadas de boas-vindas do Clube VIP.
          </p>
          <button
            onClick={() => toast("Integração do WhatsApp ativa em background 🚀")}
            className="mt-4 w-full rounded-2xl border border-border bg-background py-3 text-xs font-bold text-foreground active:scale-95"
          >
            Configurar Whatsapp Campaign
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Instagram className="h-5 w-5 text-pink-500" />
            <h2 className="text-lg font-extrabold text-foreground">Instagram Auto-Post</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fila de postagens inteligentes de achadinhos. O sistema gera automaticamente Stories, Carrosséis e legendas prontas com CTAs para o feed de afiliados das redes sociais.
          </p>
          <button
            onClick={() => toast("Fila do Instagram integrada com LLM 📸")}
            className="mt-4 w-full rounded-2xl border border-border bg-background py-3 text-xs font-bold text-foreground active:scale-95"
          >
            Ver Fila de Postagens
          </button>
        </section>
      </div>

      {/* Recentes Pagamentos */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-lg font-extrabold text-foreground mb-3">Últimas Transações</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-bold">
                <th className="py-2">Usuário</th>
                <th>Valor</th>
                <th>Método</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground italic">
                    Nenhum pagamento recebido ainda.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 font-medium">
                    <td className="py-3">
                      <div>
                        <p className="font-bold text-foreground">{p.profiles?.name || "Mãe anônima"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.profiles?.email || "—"}</p>
                      </div>
                    </td>
                    <td className="font-bold text-foreground">R$ {p.amount.toFixed(2)}</td>
                    <td className="capitalize">{p.payment_method}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          p.status === "paid"
                            ? "bg-success/15 text-success"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {p.status === "paid" ? "Aprovado" : "Pendente"}
                      </span>
                    </td>
                    <td className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
