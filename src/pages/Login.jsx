import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { db } from "@/api/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Scissors, Sparkles, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

const defaultSlides = [
  {
    image: "https://images.unsplash.com/photo-1759134248487-e8baaf31e33e?w=800&fit=crop&auto=format",
    title: "Salon Management",
    subtitle: "Otimize agendamentos, controle financeiro e melhore a experiência dos seus clientes em uma única plataforma."
  },
  {
    image: "https://images.unsplash.com/photo-1746723378067-83a345ff3160?w=800&fit=crop&auto=format",
    subtitle: "Agende, confirme e acompanhe cada atendimento com facilidade. Tudo em um só lugar.",
    title: "Controle total dos seus agendamentos."
  },
  {
    image: "https://images.unsplash.com/photo-1759134198561-e2041049419c?w=800&fit=crop&auto=format",
    subtitle: "Gerencie profissionais, serviços e horários para oferecer a melhor experiência aos seus clientes.",
    title: "Um ambiente profissional, bem organizado."
  },
  {
    image: "https://images.unsplash.com/photo-1706629503720-13cad35ce2e5?w=800&fit=crop&auto=format",
    subtitle: "Cobranças automáticas e relatórios claros para você focar no que importa: seus clientes.",
    title: "Barbearia ou salão? Nós cuidamos de tudo."
  }
];

const PALETTE_LOGIN_THEMES = {
  barbearia: { overlay: "rgba(10,10,10,0.8)", overlayGradient: "linear-gradient(160deg, rgba(10,10,10,0.95), rgba(23,23,23,0.8))", accent: "#C8A97E", formBg: "#FFFFFF", formText: "#0F172A", formMuted: "#64748B" },
  salao: { overlay: "rgba(219,39,119,0.1)", overlayGradient: "linear-gradient(160deg, rgba(255,255,255,0.97), rgba(252,231,245,0.3))", accent: "#DB2777", formBg: "#FFFFFF", formText: "#0F172A", formMuted: "#64748B" },
  clinica: { overlay: "rgba(5,150,105,0.1)", overlayGradient: "linear-gradient(160deg, rgba(255,255,255,0.97), rgba(209,250,229,0.3))", accent: "#059669", formBg: "#FFFFFF", formText: "#0F172A", formMuted: "#64748B" },
  studio: { overlay: "rgba(124,58,237,0.1)", overlayGradient: "linear-gradient(160deg, rgba(255,255,255,0.97), rgba(245,243,255,0.3))", accent: "#7C3AED", formBg: "#FFFFFF", formText: "#0F172A", formMuted: "#64748B" },
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentIcon, setCurrentIcon] = useState(0);
  const [slides, setSlides] = useState(defaultSlides);
  const [selectedPalette, setSelectedPalette] = useState("barbearia");

  useEffect(() => {
    db.entities.Settings.filter({ key: "login_carousel_images" })
      .then((results) => {
        if (results.length > 0 && results[0].value) {
          try {
            const parsed = JSON.parse(results[0].value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlides(parsed.map((s) => ({
                image: s.image,
                title: s.title || "",
                subtitle: s.subtitle || ""
              })));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    db.entities.Settings.filter({ key: "default_branding_palette" })
      .then((results) => {
        if (results.length > 0 && results[0].value) {
          setSelectedPalette(results[0].value);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % 2);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const loginTheme = PALETTE_LOGIN_THEMES[selectedPalette] || PALETTE_LOGIN_THEMES.barbearia;
  const accent = loginTheme.accent;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "E-mail ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Erro ao conectar com Google.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row login-light" style={{ background: loginTheme.formBg }}>
      {/* Left Panel — Carousel */}
      <div className="relative lg:w-1/2 h-72 lg:h-screen overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === currentSlide ? "opacity-100" : "opacity-0"}`}
          >
            <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{
              background: selectedPalette === "barbearia"
                ? "linear-gradient(135deg, rgba(12,12,12,0.85), rgba(212,165,116,0.2))"
                : selectedPalette === "salao"
                ? "linear-gradient(135deg, rgba(236,72,153,0.3), rgba(19,19,19,0.6))"
                : selectedPalette === "clinica"
                ? "linear-gradient(135deg, rgba(16,185,129,0.3), rgba(19,19,19,0.6))"
                : "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(19,19,19,0.6))",
            }} />
          </div>
        ))}

        {/* Navigation arrows */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.15)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.15)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === currentSlide ? "24px" : "8px",
                background: i === currentSlide ? accent : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>

        {/* Slide content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 z-10">
          <div className="backdrop-blur-sm rounded-2xl p-5 lg:p-8 max-w-md transition-all duration-500" style={{
            background: selectedPalette === "barbearia" ? "rgba(12,12,12,0.7)" : "rgba(0,0,0,0.45)",
            border: `1px solid ${selectedPalette === "barbearia" ? "rgba(212,165,116,0.2)" : "rgba(255,255,255,0.1)"}`,
          }}>
            <h2 className="text-white text-lg lg:text-2xl font-bold mb-2 leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-white/80 text-sm lg:text-base leading-relaxed">
              {slides[currentSlide].subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 lg:py-0 relative dark:!bg-white" style={{
        background: loginTheme.formBg,
        color: loginTheme.formText,
      }}>
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.4) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />

        <div className="w-full max-w-md relative animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  boxShadow: `0 8px 24px ${accent}35`,
                }}
              >
                <Scissors className={`w-5 h-5 text-white absolute transition-opacity duration-700 ${currentIcon === 0 ? "opacity-100" : "opacity-0"}`} />
                <Sparkles className={`w-5 h-5 text-white absolute transition-opacity duration-700 ${currentIcon === 1 ? "opacity-100" : "opacity-0"}`} />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block" style={{ color: loginTheme.formText }}>Salon Management</span>
              <span className="text-xs" style={{ color: loginTheme.formMuted }}>Sistema de Gestão</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: loginTheme.formText }}>Bem-vindo de volta</h1>
          <p className="text-sm mb-8" style={{ color: loginTheme.formMuted }}>Acesse sua conta para gerenciar seu salão</p>

          {/* Google */}
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-6 rounded-xl border-surface-200 hover:bg-surface-50"
            style={{ borderColor: "#E2E8F0", color: loginTheme.formText }}
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continuar com Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: "#E2E8F0" }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-4 font-medium" style={{ background: loginTheme.formBg, color: loginTheme.formMuted }}>ou continue com e-mail</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: loginTheme.formText }}>E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#94A3B8" }} />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-xl border-surface-200 focus:border-surface-300 focus:ring-surface-200 !text-surface-900 dark:!text-surface-900"
                  style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: loginTheme.formText }}>Senha</Label>
                <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: accent }}>
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#94A3B8" }} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-12 h-12 rounded-xl border-surface-200 focus:border-surface-300 focus:ring-surface-200"
                  style={{ borderColor: "#E2E8F0", color: "#0F172A" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
                  style={{ color: "#94A3B8" }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 font-semibold rounded-xl text-white mt-2"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                boxShadow: `0 4px 16px ${accent}30`,
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-auto pt-8 text-xs" style={{ color: "#94A3B8" }}>
          © 2024 Salon Management. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
