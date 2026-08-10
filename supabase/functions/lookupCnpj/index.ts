// Supabase Edge Function: lookupCnpj
// Consulta CNPJ via BrasilAPI e CPF via retorno básico

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
    const { document, type } = await req.json();

    if (!document) {
      return new Response(
        JSON.stringify({ error: "Documento não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanDoc = document.replace(/\D/g, "");

    if (type === "cnpj") {
      if (cleanDoc.length !== 14) {
        return new Response(
          JSON.stringify({ error: "CNPJ deve ter 14 dígitos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Consulta via BrasilAPI (gratuita, sem chave)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("BrasilAPI error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "CNPJ não encontrado ou serviço indisponível" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();

      // Mapeia resposta da BrasilAPI para o formato esperado pelo frontend
      const result = {
        cnpj: cleanDoc,
        tipo: data.tipo ? (data.tipo.includes("MATRIZ") ? "MATRIZ" : "FILIAL") : null,
        razao_social: data.razao_social || null,
        nome_fantasia: data.nome_fantasia || data.razao_social || null,
        situacao_cadastral: data.situacao_cadastral || null,
        data_abertura: data.data_abertura || null,
        capital_social: data.capital_social || null,
        porte: data.porte || null,
        cnae_principal: data.cnae_fiscal_principal || null,
        cnae_descricao: data.cnae_fiscal_descricao || null,
        natureza_juridica: data.natureza_juridica || null,
        cep: data.cep || null,
        uf: data.uf || null,
        cidade: data.municipio || null,
        bairro: data.bairro || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        email: data.email || null,
        telefone: data.telefone_1 || data.ddd_telefone_1 || null,
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "cpf") {
      if (cleanDoc.length !== 11) {
        return new Response(
          JSON.stringify({ error: "CPF deve ter 11 dígitos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // CPF não tem consulta pública gratuita confiável
      // Retorna apenas o documento para preenchimento manual
      const result = {
        cpf: cleanDoc,
        nome: null,
        data_nascimento: null,
        situacao: null,
      };

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Tipo inválido. Use 'cnpj' ou 'cpf'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("lookupCnpj error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao consultar documento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
