import { useEffect } from "react";
import { db } from "@/api/dbClient";
import { createPageUrl } from "@/utils";
import { Loader2 } from "lucide-react";

export default function Home() {
  useEffect(() => {
    db.auth.me()
      .then((user) => {
        if (!user) {
          window.location.href = "/login";
          return;
        }
        const role = user.role === "teacher" ? "profissional" : user.role === "user" ? "cliente" : user.role;
        if (role === "cliente") {
          window.location.href = createPageUrl("CustomerPortal");
        } else {
          window.location.href = createPageUrl("Dashboard");
        }
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}