import { Router } from "express";

const router = Router();

const CPF_API_KEY = process.env.CPF_API_KEY || "";

router.post("/", async (req, res) => {
  try {
    const { document, type } = req.body;
    const clean = (document || "").replace(/\D/g, "");

    if (type === "cnpj") {
      if (!clean || clean.length !== 14) {
        return res.status(400).json({ error: "CNPJ inválido. Use 14 dígitos." });
      }

      const apiRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!apiRes.ok) {
        return res.status(404).json({ error: "CNPJ não encontrado na Receita Federal" });
      }

      const data = await apiRes.json();

      return res.json({
        cnpj: clean,
        razao_social: data.razao_social || null,
        nome_fantasia: data.nome_fantasia || null,
        tipo: data.tipo || null,
        estabelecimento_tipo: data.porte || null,
        situacao_cadastral: data.situacao_cadastral || null,
        data_abertura: data.data_abertura || null,
        capital_social: data.capital_social || null,
        porte: data.porte || null,
        cnae_principal: data.cnae_principal || data.cnae_fiscal_principal || null,
        natureza_juridica: data.natureza_juridica || null,
        cep: data.cep || null,
        uf: data.uf || null,
        cidade: data.municipio || null,
        bairro: data.bairro || null,
        logradouro: data.logradouro || null,
        numero: data.numero || null,
        complemento: data.complemento || null,
        phone: data.telefone_1 || data.ddd_telefone_1 || null,
        email: data.email || null,
      });
    }

    if (type === "cpf") {
      if (!clean || clean.length !== 11) {
        return res.status(400).json({ error: "CPF inválido. Use 11 dígitos." });
      }

      if (!CPF_API_KEY) {
        return res.status(200).json({
          cpf: clean,
          nome: null,
          sexo: null,
          data_nascimento: null,
          situacao_cadastral: null,
        });
      }

      const apiRes = await fetch(`https://api.cpf-brasil.org/cpf/${clean}`, {
        headers: {
          "X-API-Key": CPF_API_KEY,
          "Content-Type": "application/json",
        },
      });

      if (!apiRes.ok) {
        const errorData = await apiRes.json().catch(() => ({}));
        return res.status(404).json({ error: errorData.message || "CPF não encontrado" });
      }

      const data = await apiRes.json();

      return res.json({
        cpf: clean,
        nome: data.data?.NOME || null,
        sexo: data.data?.SEXO || null,
        data_nascimento: data.data?.NASC || null,
        situacao_cadastral: null,
      });
    }

    return res.status(400).json({ error: "Tipo de documento inválido. Use 'cnpj' ou 'cpf'." });
  } catch (err) {
    console.error("CNPJ/CPF lookup error:", err);
    res.status(500).json({ error: "Erro ao consultar documento" });
  }
});

export default router;
