import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Query public.admin_users to see if this user is an admin
        const { data: adminUser, error } = await supabase
          .from("admin_users")
          .select("profile_id")
          .eq("profile_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        setIsAdmin(!!adminUser);
      } catch (err) {
        console.error("Erro ao verificar administrador:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Verificando credenciais de administrador...
          </p>
        </div>
      </div>
    );
  }

  // Developer bypass: if we are in local development and the user is logged in, we can let them see the admin panel
  // to help them configure the admin_users table.
  const devBypass =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    isAdmin === false;

  if (isAdmin === false && !devBypass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
          <h2 className="mt-4 text-xl font-extrabold text-foreground">
            Acesso Restrito
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você não possui permissões administrativas para acessar este painel.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (devBypass) {
    // Notify the developer they are in developer bypass mode
    useEffect(() => {
      toast.warning("Modo Desenvolvedor: Ignorando trava de admin no localhost.");
    }, []);
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-background pb-12 pt-6">
      <Outlet />
    </div>
  );
}
