import authRouter from "../server/routes/auth.js";
import { createServerSupabase } from "../server/lib/supabase.js";
import { readFileSync } from "fs";

// Load server/.env
const envContent = readFileSync("server/.env", "utf8");
const env = {};
envContent.split("\n").filter(Boolean).forEach(line => {
  if (line.startsWith("#")) return;
  const [key, ...rest] = line.split("=");
  env[key.trim()] = rest.join("=").trim();
});

// Mock request and response
const sb = createServerSupabase();

// Find a super admin user ID to mock the logged-in user
async function run() {
  try {
    const { data: users } = await sb.from("users").select("id, email, role").eq("role", "super_admin").limit(1);
    if (!users || users.length === 0) {
      console.log("No super admin user found");
      return;
    }
    const superAdmin = users[0];
    console.log("Mocking logged-in Super Admin:", superAdmin);

    // Find a target user to reset
    const { data: targetUsers } = await sb.from("users").select("id, email").limit(2);
    const targetUser = targetUsers.find(u => u.id !== superAdmin.id) || targetUsers[0];
    console.log("Target user:", targetUser);

    const req = {
      body: {
        user_id: targetUser.id,
        new_password: "newPasswordMock123!",
        must_change_password: false
      },
      user: {
        id: superAdmin.id,
        email: superAdmin.email
      },
      supabase: sb
    };

    const res = {
      status: function(code) {
        console.log("res.status called with:", code);
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log("res.json called with:", data);
        return this;
      }
    };

    // Find the handler for /admin-reset-password
    const route = authRouter.stack.find(s => s.route && s.route.path === "/admin-reset-password");
    if (!route) {
      console.error("Route /admin-reset-password not found in authRouter");
      return;
    }

    const handler = route.route.stack[0].handle;
    console.log("Invoking handler directly...");
    await handler(req, res, (err) => {
      console.log("next() called with:", err);
    });

  } catch (err) {
    console.error("Test execution threw error:", err);
  }
}

run();
