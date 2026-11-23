import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

const ROLE_CATALOG = [
  "Vendedor",
  "Gerente",
  "Caixa",
  "Estoquista",
  "Atendente",
  "Supervisor",
  "Auxiliar Administrativo",
  "Financeiro",
  "Marketing",
  "Recursos Humanos",
  "Diretor",
  "Sócio",
  "Coordenador",
  "Analista",
  "Assistente",
  "Comprador",
  "Recepcionista",
  "Motorista",
  "Entregador",
  "Faxineiro(a)",
  "Segurança",
  "Cozinheiro(a)",
  "Garçom",
  "Designer",
  "Desenvolvedor",
];

export const Route = createFileRoute("/_app/configuracoes")({ component: Config });

function Config() {
  const { isAdmin, companyId } = useAuth();
  const qc = useQueryClient();
  const { data: s } = useQuery({
    queryKey: ["settings"],
    queryFn: async () =>
      (await supabase.from("company_settings").select("*").limit(1).maybeSingle()).data,
  });
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () =>
      companyId
        ? (await supabase.from("companies").select("*").eq("id", companyId).maybeSingle()).data
        : null,
    enabled: !!companyId,
  });
  const { data: roles } = useQuery({
    queryKey: ["company_roles", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("company_roles").select("*").order("title");
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: !!companyId,
  });
  const { data: departments } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("departments").select("*").order("name");
      return (data ?? []) as { id: string; name: string; description: string | null }[];
    },
    enabled: !!companyId,
  });
  const [newRole, setNewRole] = useState("");
  const [inviteCode, setInviteCode] = useState('');
  useEffect(() => {
    let alive = true;
    if (companyId && isAdmin) {
      (supabase as any).rpc('create_invite', { p_company: companyId }).then(({ data, error }: any) => {
        if (alive && data && !error) setInviteCode(String(data).toUpperCase());
        if (alive && error) toast.error(`Convite: ${error.message}`);
      });
    }
    return () => { alive = false; };
  }, [companyId, isAdmin]);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");

  if (!isAdmin) return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;

  const inviteLink = inviteCode ? `${window.location.origin}/join?code=${inviteCode}` : "";
  const copyLink = async () => {
    if (!inviteLink) return toast.error('Ainda não foi possível gerar o convite.');
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado!");
  };
  const copyCode = async () => {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      toast.success("Código copiado!");
    }
  };

  const addRole = async () => {
    if (!newRole || !companyId) return;
    const { error } = await (supabase as any)
      .from("company_roles")
      .insert({ company_id: companyId, title: newRole });
    if (error) return toast.error(error.message);
    setNewRole("");
    toast.success("Cargo adicionado");
    qc.invalidateQueries({ queryKey: ["company_roles"] });
  };
  const removeRole = async (id: string) => {
    const { error } = await (supabase as any).from("company_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["company_roles"] });
  };
  const addDept = async () => {
    if (!newDeptName || !companyId) return;
    const { error } = await (supabase as any)
      .from("departments")
      .insert({ company_id: companyId, name: newDeptName, description: newDeptDesc || null });
    if (error) return toast.error(error.message);
    setNewDeptName("");
    setNewDeptDesc("");
    toast.success("Departamento adicionado");
    qc.invalidateQueries({ queryKey: ["departments"] });
  };
  const removeDept = async (id: string) => {
    const { error } = await (supabase as any).from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["departments"] });
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const companyId = s?.company_id;
    if (!companyId) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      company_name: String(fd.get("company_name")),
      cnpj: String(fd.get("cnpj") || "") || null,
      email: String(fd.get("email") || "") || null,
      phone: String(fd.get("phone") || "") || null,
      address: String(fd.get("address") || "") || null,
      open_time: String(fd.get("open_time") || "") || null,
      close_time: String(fd.get("close_time") || "") || null,
      logo_url: String(fd.get("logo_url") || "") || null,
      low_stock_alert: Number(fd.get("low_stock_alert")),
      high_expense_alert: Number(fd.get("high_expense_alert")),
      updated_at: new Date().toISOString(),
    } as any;
    const res = s?.id
      ? await supabase.from("company_settings").update(payload).eq("id", s.id)
      : await supabase.from("company_settings").insert({ ...payload, company_id: companyId });
    if (res.error) return toast.error(res.error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  const usedTitles = new Set((roles ?? []).map((r) => r.title));
  const availableCatalog = ROLE_CATALOG.filter((t) => !usedTitles.has(t));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Dados da empresa e limites de alerta</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Convidar funcionários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Compartilhe o código ou o link abaixo. Quem usar entra como funcionário da sua empresa.
          </p>
          <div>
            <Label>Código de convite</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={inviteCode}
                className="font-mono tracking-widest uppercase"
              />
              <Button type="button" variant="outline" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Link de convite</Label>
            <div className="flex gap-2">
              <Input readOnly value={inviteLink} />
              <Button type="button" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card id="cargos" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Cargos da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escolha os cargos que existem na sua empresa. Esses cargos ficarão disponíveis ao
            cadastrar funcionários.
          </p>
          <div className="flex gap-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                {availableCatalog.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
                {availableCatalog.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">
                    Todos os cargos já foram adicionados
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button type="button" onClick={addRole} disabled={!newRole}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {(roles ?? []).map((r) => (
              <Badge key={r.id} variant="secondary" className="gap-1 pl-3 pr-1 py-1">
                {r.title}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0"
                  onClick={() => removeRole(r.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {(roles ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum cargo cadastrado ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Departamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Organize os funcionários por área (Vendas, Financeiro, Estoque...).
          </p>
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="Nome (ex: Vendas)"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
            />
            <Input
              placeholder="Descrição (opcional)"
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
            />
            <Button type="button" onClick={addDept} disabled={!newDeptName}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-2 pt-1">
            {(departments ?? []).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <div>
                  <p className="font-medium text-sm">{d.name}</p>
                  {d.description && (
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                  )}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeDept(d.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {(departments ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum departamento cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input name="company_name" defaultValue={s?.company_name ?? "growCo."} required />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>CNPJ</Label>
                <Input name="cnpj" defaultValue={s?.cnpj ?? ""} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input name="phone" defaultValue={s?.phone ?? ""} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={s?.email ?? ""} />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                name="address"
                defaultValue={(s as any)?.address ?? ""}
                placeholder="Rua, número, cidade"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Abertura</Label>
                <Input name="open_time" type="time" defaultValue={(s as any)?.open_time ?? ""} />
              </div>
              <div>
                <Label>Fechamento</Label>
                <Input name="close_time" type="time" defaultValue={(s as any)?.close_time ?? ""} />
              </div>
            </div>
            <div>
              <Label>Logo (URL)</Label>
              <Input
                name="logo_url"
                defaultValue={(s as any)?.logo_url ?? ""}
                placeholder="https://..."
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Alerta estoque baixo (qtd)</Label>
                <Input
                  name="low_stock_alert"
                  type="number"
                  defaultValue={s?.low_stock_alert ?? 5}
                  required
                />
              </div>
              <div>
                <Label>Alerta gasto alto (R$)</Label>
                <Input
                  name="high_expense_alert"
                  type="number"
                  step="0.01"
                  defaultValue={s?.high_expense_alert ?? 10000}
                  required
                />
              </div>
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <PerformanceSettingsCard companyId={companyId} />
    </div>
  );
}

function PerformanceSettingsCard({ companyId }: { companyId: string | null }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["performance_settings", companyId],
    queryFn: async () =>
      companyId
        ? (
            await (supabase as any)
              .from("performance_settings")
              .select("*")
              .eq("company_id", companyId)
              .maybeSingle()
          ).data
        : null,
    enabled: !!companyId,
  });
  const w = (data?.weights ?? {
    sales_revenue: 0.01,
    sales_count: 10,
    products_sold: 2,
    products_registered: 5,
    stock_movements: 1,
  }) as Record<string, number>;

  const save = async (patch: Record<string, unknown>) => {
    if (!companyId) return;
    const { error } = await (supabase as any)
      .from("performance_settings")
      .upsert({ company_id: companyId, ...data, ...patch, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message);
    else {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["performance_settings"] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance & Gamificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={data?.gamification_enabled === false ? "outline" : "default"}
            onClick={() => save({ gamification_enabled: !(data?.gamification_enabled !== false) })}
          >
            Gamificação: {data?.gamification_enabled === false ? "Desativada" : "Ativada"}
          </Button>
          <Button
            size="sm"
            variant={data?.ranking_enabled === false ? "outline" : "default"}
            onClick={() => save({ ranking_enabled: !(data?.ranking_enabled !== false) })}
          >
            Ranking: {data?.ranking_enabled === false ? "Desativado" : "Ativado"}
          </Button>
          <Button
            size="sm"
            variant={data?.ranking_public === false ? "outline" : "default"}
            onClick={() => save({ ranking_public: !(data?.ranking_public !== false) })}
          >
            Visibilidade: {data?.ranking_public === false ? "Privado" : "Público"}
          </Button>
        </div>

        <div>
          <Label className="mb-2 block">Pesos por métrica</Label>
          <form
            className="grid sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const weights = {
                sales_revenue: Number(fd.get("sales_revenue")),
                sales_count: Number(fd.get("sales_count")),
                products_sold: Number(fd.get("products_sold")),
                products_registered: Number(fd.get("products_registered")),
                stock_movements: Number(fd.get("stock_movements")),
              };
              save({ weights });
            }}
          >
            <div>
              <Label>Receita de vendas (por R$)</Label>
              <Input
                name="sales_revenue"
                type="number"
                step="0.001"
                defaultValue={w.sales_revenue}
              />
            </div>
            <div>
              <Label>Nº de vendas (por venda)</Label>
              <Input name="sales_count" type="number" step="0.1" defaultValue={w.sales_count} />
            </div>
            <div>
              <Label>Produtos vendidos (por unid.)</Label>
              <Input name="products_sold" type="number" step="0.1" defaultValue={w.products_sold} />
            </div>
            <div>
              <Label>Produtos cadastrados (por item)</Label>
              <Input
                name="products_registered"
                type="number"
                step="0.1"
                defaultValue={w.products_registered}
              />
            </div>
            <div>
              <Label>Movimentações de estoque (por mov.)</Label>
              <Input
                name="stock_movements"
                type="number"
                step="0.1"
                defaultValue={w.stock_movements}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Salvar pesos</Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
