import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

const joinSearch = z.object({ code: z.string().trim().min(1).max(32) });

export const Route = createFileRoute("/join")({
  validateSearch: (s) => joinSearch.parse(s),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { code } = Route.useSearch();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", search: { code } });
    else navigate({ to: "/onboarding", search: { code } });
  }, [user, loading, code, navigate]);

  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Redirecionando...</div>;
}