import { useState, useEffect } from "react";
import { db } from "@/api/dbClient";
import { useQueryClient } from "@tanstack/react-query";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Unlink,
  Mail,
  Bell,
  Settings,
  Shield,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID || "";
const GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events";
const MICROSOFT_SCOPES = "Calendars.ReadWrite offline_access";

function getStoredTokens(userId) {
  try {
    const raw = localStorage.getItem(`calendar_tokens_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function storeTokens(userId, tokens) {
  localStorage.setItem(`calendar_tokens_${userId}`, JSON.stringify(tokens));
}

function clearTokens(userId) {
  localStorage.removeItem(`calendar_tokens_${userId}`);
}

export default function CalendarSettings() {
  const queryClient = useQueryClient();
  const theme = useThemeMode();
  const [currentUser, setCurrentUser] = useState(null);
  const [userReady, setUserReady] = useState(false);
  const [tokens, setTokens] = useState({ google: null, microsoft: null });
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    db.auth.me().then(async (u) => {
      setCurrentUser(u);
      setUserReady(true);
      const stored = getStoredTokens(u?.id);
      if (stored) setTokens(stored);
    }).catch(() => setUserReady(true));
  }, []);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash;
      if (!hash.includes("access_token")) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const provider = hash.includes("google") ? "google" : "microsoft";

      if (accessToken && currentUser?.id) {
        const newTokens = { ...tokens, [provider]: { access_token: accessToken } };
        setTokens(newTokens);
        storeTokens(currentUser.id, newTokens);
        window.history.replaceState(null, "", window.location.pathname);
        toast.success(`Calendário ${provider === "google" ? "Google" : "Microsoft"} conectado!`);
        queryClient.invalidateQueries(["calendar_settings"]);
      }
    };

    handleOAuthCallback();
  }, [currentUser]);

  const connectGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google Client ID não configurado. Adicione VITE_GOOGLE_CLIENT_ID ao .env");
      return;
    }
    const redirectUri = `${window.location.origin}/CalendarSettings`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(GOOGLE_SCOPES)}&prompt=consent`;
    window.location.href = url;
  };

  const connectMicrosoft = () => {
    if (!MICROSOFT_CLIENT_ID) {
      toast.error("Microsoft Client ID não configurado. Adicione VITE_MICROSOFT_CLIENT_ID ao .env");
      return;
    }
    const redirectUri = `${window.location.origin}/CalendarSettings`;
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(MICROSOFT_SCOPES)}&prompt=consent`;
    window.location.href = url;
  };

  const disconnect = (provider) => {
    const newTokens = { ...tokens, [provider]: null };
    setTokens(newTokens);
    if (currentUser?.id) storeTokens(currentUser.id, newTokens);
    toast.info(`Calendário ${provider === "google" ? "Google" : "Microsoft"} desconectado`);
  };

  const isGoogleConnected = !!tokens.google?.access_token;
  const isMicrosoftConnected = !!tokens.microsoft?.access_token;

  if (!userReady) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-branding-primary" />
      </div>
    );
  }

  return (
    <div className={cn("max-w-3xl mx-auto p-4 sm:p-6 space-y-6", theme.pageBg)}>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: theme.cardText }}>Integração com Calendário</h1>
        <p className="text-sm mt-1" style={{ color: theme.mutedText }}>Conecte seus calendários para sincronizar agendamentos automaticamente</p>
      </div>

      {/* Connection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Google Calendar */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Google Calendar</CardTitle>
                <CardDescription className="text-xs">
                  {isGoogleConnected ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Conectado
                    </span>
                  ) : (
                    "Sincronize com o Google Calendar"
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isGoogleConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Sincronização automática ativa
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect("google")}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {!GOOGLE_CLIENT_ID && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Configure VITE_GOOGLE_CLIENT_ID no .env
                  </div>
                )}
                <Button
                  onClick={connectGoogle}
                  className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  disabled={!GOOGLE_CLIENT_ID}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Conectar Google Calendar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Microsoft Outlook */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#0078D4" d="M21.5 4.5H9.5v15h12V4.5zM11 6v12H3V6h8zm8 12V9l-6 4.5V9"/>
                  <path fill="#0078D4" d="M1 4.5h8v15H1z" opacity="0.3"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Microsoft Outlook</CardTitle>
                <CardDescription className="text-xs">
                  {isMicrosoftConnected ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Conectado
                    </span>
                  ) : (
                    "Sincronize com o Outlook / Office 365"
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMicrosoftConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Sincronização automática ativa
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect("microsoft")}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {!MICROSOFT_CLIENT_ID && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Configure VITE_MICROSOFT_CLIENT_ID no .env
                  </div>
                )}
                <Button
                  onClick={connectMicrosoft}
                  className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  disabled={!MICROSOFT_CLIENT_ID}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                    <rect fill="#F25022" x="1" y="1" width="10" height="10"/>
                    <rect fill="#7FBA00" x="13" y="1" width="10" height="10"/>
                    <rect fill="#00A4EF" x="1" y="13" width="10" height="10"/>
                    <rect fill="#FFB900" x="13" y="13" width="10" height="10"/>
                  </svg>
                  Conectar Outlook
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sync Settings */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-branding-primary/10">
              <Settings className="w-5 h-5 text-branding-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Configurações de Sincronização</CardTitle>
              <CardDescription>Controle como os agendamentos são sincronizados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-branding-primary" />
              <div>
                <p className="text-sm font-medium text-gray-900">Sincronização Automática</p>
                <p className="text-xs text-gray-500">Sincroniza ao criar, atualizar ou excluir agendamentos</p>
              </div>
            </div>
            <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-branding-primary" />
              <div>
                <p className="text-sm font-medium text-gray-900">E-mail de Confirmação</p>
                <p className="text-xs text-gray-500">Envia e-mail ao cliente ao agendar com .ics para adicionar ao celular</p>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-branding-primary" />
              <div>
                <p className="text-sm font-medium text-gray-900">Lembrete por E-mail</p>
                <p className="text-xs text-gray-500">Envia lembrete 1 dia antes do agendamento</p>
              </div>
            </div>
            <Switch checked={true} />
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Como Funciona</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-branding-primary/10 text-branding-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <p><strong>Conecte</strong> sua conta Google ou Microsoft usando OAuth seguro</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-branding-primary/10 text-branding-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <p><strong>Sincronize</strong> — ao criar um agendamento, ele aparece automaticamente no seu calendário</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-branding-primary/10 text-branding-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <p><strong>Clientes recebem</strong> e-mail de confirmação com arquivo .ics para adicionar ao calendário do celular</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-branding-primary/10 text-branding-primary flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            <p><strong>Lembretes</strong> automáticos 1 hora antes e 1 dia antes do horário agendado</p>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Links (for adding to any calendar app) */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Links Rápidos</CardTitle>
              <CardDescription>Adicione o calendário do salão em qualquer aplicativo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Abrir Google Calendar</span>
            </a>
            <a
              href="https://outlook.live.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Abrir Outlook Calendar</span>
            </a>
            <a
              href="https://calendar.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Abrir Apple Calendar</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
