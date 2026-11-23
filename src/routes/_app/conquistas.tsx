import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { RibbonIcon } from "@/components/RibbonIcon";
import { BADGES, SECTOR_LABEL, type BadgeDef } from "@/lib/badges";

export const Route = createFileRoute("/_app/conquistas")({ component: Conquistas });

type Filter = "all" | "unlocked" | "locked";

function Conquistas() {
  const { user, companyId } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => (await supabase.from("employees").select("id, full_name").eq("user_id", user!.id).maybeSingle()).data,
    enabled: !!user && !!companyId,
  });

  const { data: myBadges } = useQuery({
    queryKey: ["my-badges", employee?.id],
    queryFn: async () => (await supabase.from("employee_badges").select("badge_code, unlocked_at").eq("employee_id", employee!.id)).data ?? [],
    enabled: !!employee?.id,
  });

  const unlockedCodes = useMemo(() => new Set((myBadges ?? []).map((b) => b.badge_code)), [myBadges]);

  const filtered = BADGES.filter((b) => filter === "all" || (filter === "unlocked" ? unlockedCodes.has(b.code) : !unlockedCodes.has(b.code)));

  const bySector = filtered.reduce<Record<string, BadgeDef[]>>((acc, b) => {
    (acc[b.sector] ||= []).push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Conquistas</h1>
        <p className="text-muted-foreground text-sm">{unlockedCodes.size} de {BADGES.length} insígnias desbloqueadas</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Todas</Button>
          <Button size="sm" variant={filter === "unlocked" ? "default" : "outline"} onClick={() => setFilter("unlocked")}>Desbloqueadas ({unlockedCodes.size})</Button>
          <Button size="sm" variant={filter === "locked" ? "default" : "outline"} onClick={() => setFilter("locked")}>Bloqueadas ({BADGES.length - unlockedCodes.size})</Button>
        </CardContent>
      </Card>

      {Object.entries(bySector).map(([sector, list]) => (
        <Card key={sector}>
          <CardHeader><CardTitle className="flex items-center gap-2">{SECTOR_LABEL[sector as BadgeDef["sector"]]} <Badge variant="secondary">{list.length}</Badge></CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map((b) => {
                const unlocked = unlockedCodes.has(b.code);
                return (
                  <div key={b.code} className={`relative p-4 rounded-lg border text-center transition-all ${unlocked ? "border-primary shadow-md" : "opacity-60 grayscale"}`}>
                    <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center text-white text-3xl ${b.color} ${unlocked ? "animate-in zoom-in" : ""}`}>
                      {unlocked ? <RibbonIcon className="h-8 w-8" /> : <Lock className="h-6 w-6" />}
                    </div>
                    <p className="font-semibold mt-3 text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                    {unlocked && <Badge className="mt-2" variant="default">Desbloqueada</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {!employee && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">Vincule seu usuário a um funcionário em <strong>Ponto</strong> para começar a desbloquear insígnias.</CardContent></Card>
      )}
    </div>
  );
}