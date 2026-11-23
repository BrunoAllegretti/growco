import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { initializeCompany, resetMobileDbCache, supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Building2, UserPlus } from "lucide-react";

const onboardingSearch = z.object({ code: z.string().trim().max(32).optional() });

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s) => onboardingSearch.parse(s),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading, companyId, refreshCompany } = useAuth();
  const { code } = Route.useSearch();
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState(code ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(code ? "join" : "create");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { code } });
  }, [user, loading, code, navigate]);

  useEffect(() => {
    if (!loading && companyId) navigate({ to: "/dashboard" });
  }, [companyId, loading, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data: newCompanyId, error } = await (supabase as any).rpc('create_company', { p_name: companyName.trim() });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    try { await initializeCompany(String(newCompanyId), companyName.trim()); }
    catch (err: any) { toast.error(`Empresa criada, mas a configuração inicial falhou: ${err.message}`); }
    resetMobileDbCache();
    toast.success("Empresa criada!");
    await refreshCompany();
    navigate({ to: "/dashboard" });
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await (supabase as any).rpc('join_company', { p_code: inviteCode.trim().toLowerCase() });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    resetMobileDbCache();
    toast.success("Você entrou na empresa!");
    await refreshCompany();
    navigate({ to: "/dashboard" });
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-primary/10 px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3"><Logo className="text-3xl text-primary" /></div>
          <CardTitle>Bem-vindo!</CardTitle>
          <CardDescription>Crie a sua empresa ou entre em uma existente usando o convite</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="create"><Building2 className="h-4 w-4 mr-2" />Criar empresa</TabsTrigger>
              <TabsTrigger value="join"><UserPlus className="h-4 w-4 mr-2" />Entrar com convite</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="pt-4">
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="cname">Nome da empresa</Label>
                  <Input id="cname" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required maxLength={120} placeholder="Ex.: Padaria do João" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !companyName.trim()}>
                  {submitting ? "Criando..." : "Criar minha empresa"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Você será o dono e poderá convidar funcionários depois</p>
              </form>
            </TabsContent>
            <TabsContent value="join" className="pt-4">
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <Label htmlFor="code">Código de convite</Label>
                  <Input id="code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} required maxLength={32} placeholder="Ex.: A1B2C3D4" className="uppercase tracking-wider" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !inviteCode.trim()}>
                  {submitting ? "Entrando..." : "Entrar como funcionário"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Peça o código ao dono da empresa</p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}