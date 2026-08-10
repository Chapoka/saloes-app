import { Router } from "express";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { cep } = req.body;
    if (!cep || !/^\d{8}$/.test(cep)) {
      return res.status(400).json({ error: "CEP inválido. Use 8 dígitos." });
    }

    const viaRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const viaData = await viaRes.json();

    if (viaData.erro) {
      return res.status(404).json({ error: "CEP não encontrado" });
    }

    res.json({
      cep: viaData.cep,
      street: viaData.logradouro,
      neighborhood: viaData.bairro,
      city: viaData.localidade,
      state: viaData.uf,
      complement: viaData.complemento,
    });
  } catch (err) {
    console.error("CEP lookup error:", err);
    res.status(500).json({ error: "Erro ao consultar CEP" });
  }
});

export default router;
