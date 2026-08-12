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

router.post("/create-professional-services-table", async (req, res) => {
  try {
    const sb = createServerSupabase();
    
    const { error } = await sb.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS professional_services (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
          commission_pct NUMERIC(5,2) DEFAULT 0,
          performs_service BOOLEAN DEFAULT true,
          price_override NUMERIC(10,2),
          duration_override INTEGER,
          company_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(professional_id, service_id)
        );
        
        ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view professional_services" ON professional_services
          FOR SELECT USING (true);
        
        CREATE POLICY "Admins can manage professional_services" ON professional_services
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role IN ('super_admin', 'admin')
            )
          );
      `
    });

    if (error) throw error;

    res.json({ 
      success: true,
      message: "professional_services table created with performs_service, price_override, duration_override"
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
