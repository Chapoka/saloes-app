import { createServerSupabase } from "../lib/supabase.js";
import express from "express";

const router = express.Router();

router.post("/set-defaults", async (req, res) => {
  try {
    const sb = createServerSupabase();
    
    const { data: services, error } = await sb
      .from("services")
      .select("id, service_type")
      .is("service_type", null);

    if (error) throw error;

    if (services && services.length > 0) {
      const { error: updateError } = await sb
        .from("services")
        .update({ service_type: "Normal" })
        .in("id", services.map(s => s.id));

      if (updateError) throw updateError;
    }

    res.json({ 
      success: true, 
      updated: services?.length || 0,
      message: `Updated ${services?.length || 0} services with default service_type`
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
