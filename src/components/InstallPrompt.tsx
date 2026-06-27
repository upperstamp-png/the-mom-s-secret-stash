import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import logo from "@/assets/logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "csa.installDismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined")
      window.localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-3xl border border-border bg-card/95 p-3 shadow-float backdrop-blur">
        <img
          src={logo}
          alt="Clube Secreto"
          width={44}
          height={44}
          className="h-11 w-11 rounded-2xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            Instalar o Clube
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Acesso rápido às ofertas na tela inicial
          </p>
        </div>
        <button
          onClick={install}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow active:scale-95"
        >
          <Download className="h-4 w-4" />
          Instalar
        </button>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
