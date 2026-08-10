// Supabase Edge Function: lookupCep
// Consulta CEP via ViaCEP (gratuita, sem chave de API)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();

    if (!cep) {
      return new Response(
        JSON.stringify({ error: "CEP não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      return new Response(
        JSON.stringify({ error: "CEP deve ter 8 dígitos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consulta via ViaCEP (gratuita, sem chave)
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

    if (!response.ok) {
      console.error("ViaCEP error:", response.status);
      return new Response(
        JSON.stringify({ error: "Serviço de CEP indisponível" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (data.erro) {
      return new Response(
        JSON.stringify({ error: "CEP não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mapeia resposta da ViaCEP para o formato esperado pelo frontend
    const result = {
      cep: data.cep || cleanCep,
      street: data.logradouro || null,
      neighborhood: data.bairro || null,
      city: data.localidade || null,
      state: data.uf || null,
      complemento: data.complemento || null,
      ibge: data.ibge || null,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("lookupCep error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao consultar CEP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
