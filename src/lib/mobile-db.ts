/**
 * Adaptador web para o contrato de dados do growCo Mobile.
 * A fonte de verdade é o Supabase do aplicativo (public.records + RPCs).
 * Não cria um banco paralelo e preserva os componentes/estilos do site.
 */
import { supabase as backend } from '@/integrations/supabase/client';

type Data = Record<string, any>;
type Filter = { op: 'eq' | 'is' | 'gte' | 'lte' | 'gt' | 'lt' | 'like'; field: string; value: any };
type Result = { data: any; error: { message: string } | null; count?: number | null };
type Context = { companyId: string; userId: string; owner: boolean };
const defaultRoles = ['Vendedor', 'Gerente', 'Caixa', 'Estoquista', 'Atendente'];
const emptyCompany = { company_name: 'growCo.', cnpj: '', phone: '', email: '', address: '', open_time: '', close_time: '', logo_url: '', low_stock_alert: '5', high_expense_alert: '10000' };
const kindMap: Record<string, string> = {
  products: 'products', stock_movements: 'moves', sales: 'sales', transactions: 'transactions',
  employees: 'employees', salary_payments: 'payments', teams: 'teams', goals: 'goals',
  time_entries: 'timeEntries', departments: 'departments',
};
let cachedContext: { value: Context; time: number } | undefined;
const stagedSales = new Map<string, { id: string; customer_name: string; company_id: string }>();
export const resetMobileDbCache = () => { cachedContext = undefined; };
const now = () => new Date().toISOString();
const dateKey = () => now().slice(0, 10);
const uid = () => crypto.randomUUID();
const fail = (message: string): Result => ({ data: null, error: { message } });
const ok = (data: any = null, count?: number): Result => ({ data, error: null, ...(count === undefined ? {} : { count }) });
const throwOnError = (result: { error: any }) => { if (result.error) throw new Error(result.error.message); };

async function context(): Promise<Context> {
  if (cachedContext && Date.now() - cachedContext.time < 10000) return cachedContext.value;
  const { data: { user }, error } = await backend.auth.getUser();
  if (error || !user) throw new Error('Faça login para acessar os dados da empresa.');
  const membership = await backend.from('company_members').select('company_id,role').eq('user_id', user.id).maybeSingle();
  throwOnError(membership);
  if (!membership.data) throw new Error('Entre em uma empresa para continuar.');
  const value = { companyId: membership.data.company_id, userId: user.id, owner: membership.data.role === 'owner' };
  cachedContext = { value, time: Date.now() };
  return value;
}

async function records(kind: string, companyId: string) {
  const result = await (backend as any).from('records').select('record_id,data,updated_at,updated_by')
    .eq('company_id', companyId).eq('kind', kind).limit(10000);
  throwOnError(result);
  return (result.data || []).map((r: Data) => ({ ...r.data,
    ...(kind === 'goals' ? { active: r.data.active !== false } : {}),
    id: r.record_id, created_at: r.data.created_at || r.updated_at,
    updated_at: r.updated_at, updated_by: r.updated_by }));
}
async function settings(key: string, ctx: Context): Promise<any> {
  const result = await (backend as any).from('records').select('data').eq('company_id', ctx.companyId)
    .eq('kind', 'settings').eq('record_id', key).maybeSingle();
  throwOnError(result);
  return result.data?.data?.value;
}
async function saveSetting(key: string, value: any, ctx: Context) {
  if (!ctx.owner) throw new Error('Somente administradores podem alterar configurações.');
  const result = await (backend as any).from('records').upsert({ company_id: ctx.companyId, kind: 'settings', record_id: key,
    data: { value }, updated_at: now(), updated_by: ctx.userId }, { onConflict: 'company_id,kind,record_id' });
  throwOnError(result);
}
async function put(kind: string, value: Data, ctx: Context, id = value.id || uid()) {
  if (!ctx.owner) throw new Error('Esta operação é restrita ao administrador.');
  const data: Data = { ...value, id };
  delete data.company_id;
  delete data.created_by;
  delete data.updated_by;
  const result = await (backend as any).from('records').upsert({ company_id: ctx.companyId, kind, record_id: id,
    data, updated_by: ctx.userId, updated_at: now() }, { onConflict: 'company_id,kind,record_id' });
  throwOnError(result);
  return data;
}
async function remove(kind: string, id: string, ctx: Context) {
  if (!ctx.owner) throw new Error('Somente administradores podem excluir estes registros.');
  const result = await (backend as any).from('records').delete().eq('company_id', ctx.companyId).eq('kind', kind).eq('record_id', id);
  throwOnError(result);
}
async function linkedEmployees(ctx: Context): Promise<Data[]> {
  const employees = ctx.owner ? await records('employees', ctx.companyId)
    : (() => null)();
  const listed = ctx.owner ? employees : await (async () => {
    const result = await (backend as any).rpc('list_company_employees', { p_company: ctx.companyId });
    throwOnError(result);
    return (result.data || []) as Data[];
  })();
  const own = await (backend as any).from('user_profiles').select('employee_id,user_id')
    .eq('company_id', ctx.companyId).eq('user_id', ctx.userId).maybeSingle();
  throwOnError(own);
  const identities: Record<string, string> = {};
  if (own.data?.employee_id) identities[own.data.employee_id] = ctx.userId;
  if (ctx.owner) {
    const members = await (backend as any).rpc('list_company_members', { p_company: ctx.companyId });
    if (!members.error) for (const member of members.data || []) if (member.employee_id) identities[member.employee_id] = member.user_id;
  }
  return (listed || []).map((emp: Data) => ({ ...emp, user_id: identities[emp.id] || null, avatar_url: emp.avatar_url || null }));
}

async function readTable(table: string, ctx: Context): Promise<Data[]> {
  if (table === 'employees') return linkedEmployees(ctx);
  if (table === 'company_roles') {
    const roles = (await settings('roles', ctx)) || defaultRoles;
    return roles.map((title: string) => ({ id: title, title, company_id: ctx.companyId }));
  }
  if (table === 'company_settings') {
    const value = await settings('company', ctx) || { ...emptyCompany };
    return [{ ...emptyCompany, ...value, id: 'company', company_id: ctx.companyId }];
  }
  if (table === 'performance_settings') {
    const weights = await settings('weights', ctx) || { sales_revenue: '0.01', sales_count: '10', products_sold: '2', products_registered: '5', stock_movements: '1' };
    const gamification = await settings('gamification', ctx);
    const ranking = await settings('ranking', ctx);
    const rankingPublic = await settings('rankingPublic', ctx);
    return [{ id: 'performance_settings', company_id: ctx.companyId, weights,
      gamification_enabled: gamification !== false, ranking_enabled: ranking !== false, ranking_public: rankingPublic !== false }];
  }
  if (table === 'categories' || table === 'employee_badges') return [];
  if (table === 'team_members') {
    const teams = await records('teams', ctx.companyId);
    return teams.flatMap((t: Data) => (t.members || []).map((id: string) => ({ id: `${t.id}::${id}`, team_id: t.id, employee_id: id })));
  }
  if (table === 'sale_items') {
    const sales = await records('sales', ctx.companyId);
    return sales.flatMap((sale: Data) => (sale.items || []).map((item: Data) => ({ ...item, id: `${sale.id}::${item.product_id}`, sale_id: sale.id })));
  }
  const kind = kindMap[table];
  if (!kind) throw new Error(`Tabela não suportada pelo banco do aplicativo: ${table}`);
  return records(kind, ctx.companyId);
}

async function decorate(table: string, list: Data[], ctx: Context): Promise<Data[]> {
  if (table === 'sales') {
    const products = await records('products', ctx.companyId);
    return list.map(s => ({ ...s, created_by: s.seller_user_id || s.created_by || null,
      sale_items: (s.items || []).map((i: Data) => ({ ...i, products: { name: products.find((p: Data) => p.id === i.product_id)?.name || '—' } })) }));
  }
  if (table === 'stock_movements') {
    const products = await records('products', ctx.companyId);
    return list.map(m => ({ ...m, products: { name: products.find((p: Data) => p.id === m.product_id)?.name || '—' } }));
  }
  if (table === 'time_entries' || table === 'salary_payments' || table === 'team_members' || table === 'teams') {
    const employees = await linkedEmployees(ctx);
    if (table === 'time_entries' || table === 'salary_payments') return list.map(e => ({ ...e,
      hours: e.clock_out && e.clock_in ? (Date.parse(e.clock_out) - Date.parse(e.clock_in)) / 3600000 : null,
      employees: { full_name: employees.find((x: Data) => x.id === e.employee_id)?.full_name || '—' } }));
    if (table === 'teams') return list.map(t => ({ ...t,
      team_members: (t.members || []).map((employeeId: string) => ({ id: `${t.id}::${employeeId}`,
        employee_id: employeeId, employees: employees.find((e: Data) => e.id === employeeId) || null })) }));
    const teams = await records('teams', ctx.companyId);
    return list.map(m => ({ ...m, teams: teams.find((t: Data) => t.id === m.team_id) || null }));
  }
  if (table === 'transactions') return list.map(t => ({ ...t,
    category_id: t.category_id || null, categories: t.category ? { name: t.category } : null }));
  return list;
}

function matches(obj: Data, f: Filter) {
  const v = obj[f.field] ?? null;
  if (f.op === 'eq') return String(v) === String(f.value);
  if (f.op === 'is') return f.value === null ? v === null : v === f.value;
  if (f.op === 'gte') return String(v ?? '') >= String(f.value);
  if (f.op === 'lte') return String(v ?? '') <= String(f.value);
  if (f.op === 'gt') return typeof v === 'number' ? v > Number(f.value) : String(v ?? '') > String(f.value);
  if (f.op === 'lt') return typeof v === 'number' ? v < Number(f.value) : String(v ?? '') < String(f.value);
  if (f.op === 'like') return new RegExp(`^${String(f.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`).test(String(v));
  return true;
}
async function modify(table: string, action: 'insert' | 'update' | 'delete', payload: any, filters: Filter[], ctx: Context): Promise<any> {
  const current = await readTable(table, ctx);
  const targets = current.filter((x: Data) => filters.every(f => matches(x, f)));
  if (action !== 'insert' && !filters.length) throw new Error('Filtro obrigatório para alterações.');
  if (table === 'products') {
    if (!ctx.owner) throw new Error('Somente administradores podem gerenciar produtos.');
    if (action === 'delete') throw new Error('Exclusão de produtos não está disponível no aplicativo.');
    const output = [];
    for (const row of action === 'insert' ? (Array.isArray(payload) ? payload : [payload]) : targets.map((x: Data) => ({ ...x, ...payload }))) {
      const product = { id: row.id || uid(), name: row.name, sku: row.sku || '', price: Number(row.price || 0),
        cost: Number(row.cost || 0), stock: Number(row.stock || 0), min_stock: Number(row.min_stock || 0), active: row.active !== false };
      const res = await (backend as any).rpc('save_product', { p_company: ctx.companyId, p_product: product, p_edit: action === 'update' });
      throwOnError(res);
      output.push(product);
    }
    return output;
  }
  if (table === 'stock_movements') {
    if (action !== 'insert') throw new Error('Movimentações de estoque não podem ser editadas.');
    const output = [];
    for (const row of Array.isArray(payload) ? payload : [payload]) {
      if (row.type !== 'in') throw new Error('Saídas de estoque devem ser feitas pelas vendas.');
      const p = (await readTable('products', ctx)).find(x => x.id === row.product_id);
      const res = await (backend as any).rpc('add_stock', { p_company: ctx.companyId, p_product_id: row.product_id,
        p_quantity: Number(row.quantity), p_cost: Number(row.unit_cost ?? p?.cost ?? 0), p_reason: row.reason || 'Compra de fornecedor' });
      throwOnError(res);
      output.push(row);
    }
    return output;
  }
  if (table === 'sales' && action === 'insert') {
    const sale = { ...payload, id: uid() };
    stagedSales.set(sale.id, { id: sale.id, customer_name: sale.customer_name || '', company_id: ctx.companyId });
    return [sale];
  }
  if (table === 'sale_items' && action === 'insert') {
    const saleId = (Array.isArray(payload) ? payload[0] : payload)?.sale_id;
    const sale = stagedSales.get(saleId);
    if (!sale || sale.company_id !== ctx.companyId) throw new Error('Registre os itens junto com a venda.');
    const res = await (backend as any).rpc('register_sale', { p_company: ctx.companyId, p_sale_id: sale.id,
      p_customer: sale.customer_name, p_items: Array.isArray(payload) ? payload.map((p: Data) => ({ product_id: p.product_id, quantity: p.quantity, unit_price: p.unit_price })) : [payload] });
    throwOnError(res);
    stagedSales.delete(sale.id);
    return [];
  }
  if (table === 'sales' && action === 'update') {
    for (const sale of targets) {
      if (payload.paid === true && !sale.paid) {
        const res = await (backend as any).rpc('mark_sale_paid', { p_company: ctx.companyId, p_sale_id: sale.id });
        throwOnError(res);
      } else throw new Error('Somente a confirmação de pagamento está disponível para vendas.');
    }
    return targets;
  }
  if (table === 'time_entries') {
    if (action === 'delete') throw new Error('O histórico de ponto não pode ser excluído.');
    const res = await (backend as any).rpc('clock_my_time', { p_company: ctx.companyId });
    throwOnError(res);
    return targets;
  }
  if (table === 'team_members') {
    for (const row of action === 'insert' ? (Array.isArray(payload) ? payload : [payload]) : targets) {
      const teams = await readTable('teams', ctx);
      const team = teams.find((x: Data) => x.id === row.team_id);
      if (!team) throw new Error('Equipe não encontrada.');
      const members: string[] = team.members || [];
      const updated = action === 'insert' ? [...new Set([...members, row.employee_id])] : members.filter(x => x !== row.employee_id);
      await put('teams', { ...team, members: updated }, ctx, team.id);
    }
    return [];
  }
  if (table === 'company_roles') {
    const roles = (await settings('roles', ctx)) || defaultRoles;
    let updated = [...roles];
    if (action === 'insert') for (const row of Array.isArray(payload) ? payload : [payload]) {
      if (row.title?.trim() && !updated.includes(row.title.trim())) updated.push(row.title.trim());
    }
    else if (action === 'delete') updated = updated.filter(x => !targets.some(t => t.id === x));
    else throw new Error('Cargo não pode ser alterado.');
    await saveSetting('roles', updated, ctx);
    return [];
  }
  if (table === 'company_settings') {
    if (action === 'delete') throw new Error('Configurações da empresa não podem ser apagadas.');
    const previous = await settings('company', ctx) || { ...emptyCompany };
    const row = Array.isArray(payload) ? payload[0] : payload;
    await saveSetting('company', { ...previous, ...row, company_id: undefined, id: undefined }, ctx);
    return [{ ...previous, ...row, id: 'company' }];
  }
  if (table === 'performance_settings') {
    if (action === 'delete') throw new Error('Configurações não podem ser apagadas.');
    const row = Array.isArray(payload) ? payload[0] : payload;
    if (row.weights) await saveSetting('weights', row.weights, ctx);
    if (typeof row.gamification_enabled === 'boolean') await saveSetting('gamification', row.gamification_enabled, ctx);
    if (typeof row.ranking_enabled === 'boolean') await saveSetting('ranking', row.ranking_enabled, ctx);
    if (typeof row.ranking_public === 'boolean') await saveSetting('rankingPublic', row.ranking_public, ctx);
    return [row];
  }
  if (table === 'employee_badges' || table === 'categories') throw new Error('Esse módulo não está disponível no banco do aplicativo.');
  if (table === 'sale_items') throw new Error('Itens de venda só podem ser criados durante a venda.');
  const kind = kindMap[table];
  if (!kind) throw new Error(`Tabela sem correspondência: ${table}`);
  if (action === 'delete') {
    for (const row of targets) {
      await remove(kind, row.id, ctx);
      if (table === 'salary_payments') {
        const payments = await readTable('transactions', ctx);
        for (const p of payments.filter((t: Data) => t.payment_id === row.id)) await remove('transactions', p.id, ctx);
      }
    }
    return targets;
  }
  const items = action === 'insert' ? (Array.isArray(payload) ? payload : [payload]) : targets.map(t => ({ ...t, ...payload }));
  const out: Data[] = [];
  for (const item of items) {
    const original = action === 'update' ? current.find((x: Data) => x.id === item.id) : null;
    const row = { ...item, id: item.id || uid() };
    if (table === 'employees') {
      row.email ||= '';
      row.department_id ||= '';
      row.active ??= true;
      row.salary ??= 0;
      row.hire_date ||= dateKey();
      delete row.user_id; // Vínculo é controlado exclusivamente por user_profiles + RPC.
    }
    if (table === 'teams') row.members ||= [];
    if (table === 'goals') { row.active ??= true; row.assignee_id ||= ''; }
    if (table === 'salary_payments') {
      row.notes ||= '';
      row.paid = Boolean(row.paid);
    }
    if (table === 'transactions') { row.category = row.category || ''; row.occurred_at ||= dateKey(); }
    const saved = await put(kind, row, ctx, row.id);
    out.push(saved);
    if (table === 'salary_payments' && row.paid !== original?.paid) {
      const txs = await readTable('transactions', ctx);
      const old = txs.filter((t: Data) => t.payment_id === row.id);
      for (const oldTx of old) await remove('transactions', oldTx.id, ctx);
      if (row.paid) {
        const employees = await readTable('employees', ctx);
        const employeeName = employees.find((e: Data) => e.id === row.employee_id)?.full_name || '';
        await put('transactions', { payment_id: row.id, id: uid(), type: 'expense',
          description: `Salário - ${employeeName}`, amount: Number(row.amount), category: '', occurred_at: dateKey() }, ctx);
      }
    }
  }
  return out;
}

class MobileTableQuery implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private ordering: { field: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;
  private isSingle = false;
  private selectMode = false;
  private countMode = false;
  private operation: 'read' | 'insert' | 'update' | 'delete' = 'read';
  private payload: any;
  constructor(private table: string) {}
  select(_columns = '*', options?: { count?: string }): this { this.selectMode = true; this.countMode = options?.count === 'exact'; return this; }
  insert(value: any): this { this.operation = 'insert'; this.payload = value; return this; }
  upsert(value: any): this { this.operation = 'insert'; this.payload = value; return this; }
  update(value: any): this { this.operation = 'update'; this.payload = value; return this; }
  delete(): this { this.operation = 'delete'; return this; }
  eq(field: string, value: any): this { this.filters.push({ op: 'eq', field, value }); return this; }
  is(field: string, value: any): this { this.filters.push({ op: 'is', field, value }); return this; }
  gte(field: string, value: any): this { this.filters.push({ op: 'gte', field, value }); return this; }
  lte(field: string, value: any): this { this.filters.push({ op: 'lte', field, value }); return this; }
  gt(field: string, value: any): this { this.filters.push({ op: 'gt', field, value }); return this; }
  lt(field: string, value: any): this { this.filters.push({ op: 'lt', field, value }); return this; }
  like(field: string, value: any): this { this.filters.push({ op: 'like', field, value }); return this; }
  order(field: string, options?: { ascending?: boolean }): this { this.ordering = { field, ascending: options?.ascending !== false }; return this; }
  limit(n: number): this { this.maxRows = n; return this; }
  maybeSingle(): this { this.isSingle = true; return this; }
  single(): this { this.isSingle = true; return this; }
  async run(): Promise<Result> {
    try {
      const ctx = await context();
      if (this.operation !== 'read') {
        const items = await modify(this.table, this.operation, this.payload, this.filters, ctx);
        const data = this.selectMode ? (this.isSingle ? items[0] || null : items) : null;
        return ok(data);
      }
      let list = await readTable(this.table, ctx);
      list = await decorate(this.table, list, ctx);
      list = list.filter((item: Data) => this.filters.every(f => matches(item, f)));
      const total = list.length;
      if (this.ordering) {
        const { field, ascending } = this.ordering;
        list.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'pt-BR', { numeric: true }) * (ascending ? 1 : -1));
      }
      if (this.maxRows !== null) list = list.slice(0, this.maxRows);
      return ok(this.isSingle ? list[0] || null : list, this.countMode ? total : undefined);
    } catch (e: any) { return fail(e?.message || String(e)); }
  }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

async function scoreEmployee(_args: any) { return ok(0); } // Mobile ainda mantém a pontuação em 0.
async function progressGoal(args: any): Promise<Result> {
  try {
    const ctx = await context();
    const goal = (await records('goals', ctx.companyId)).find(g => g.id === args._goal_id);
    if (!goal || goal.active === false) return ok(0);
    const sales = (await records('sales', ctx.companyId)).filter(s => s.occurred_at?.slice(0,10) >= goal.start_date && s.occurred_at?.slice(0,10) <= goal.end_date);
    const owner = await linkedEmployees(ctx);
    const teams = await records('teams', ctx.companyId);
    const assigned = (s: Data) => {
      if (goal.assignee_type === 'company') return true;
      const seller = owner.find(e => e.user_id && e.user_id === (s.seller_user_id || s.created_by));
      if (!seller) return false;
      if (goal.assignee_type === 'employee') return seller.id === goal.assignee_id;
      if (goal.assignee_type === 'team') return teams.some(t => t.id === goal.assignee_id && (t.members || []).includes(seller.id));
      return false;
    };
    const mine = sales.filter(assigned);
    return ok(goal.metric === 'sales_count' ? mine.length : goal.metric === 'products_sold'
      ? mine.reduce((sum: number, s: Data) => sum + (s.items || []).reduce((n: number, i: Data) => n + Number(i.quantity), 0), 0)
      : mine.reduce((sum: number, s: Data) => sum + Number(s.total), 0));
  } catch (e: any) { return fail(e.message); }
}
async function goalCalendar(args: any): Promise<Result> {
  try {
    const ctx = await context();
    const goals = (await records('goals', ctx.companyId)).filter(g => g.active !== false && g.assignee_type === 'company');
    const sales = await records('sales', ctx.companyId);
    const result = [];
    for (let day = new Date(`${args._start}T12:00:00`); day.toISOString().slice(0,10) <= args._end; day.setDate(day.getDate()+1)) {
      const date = day.toISOString().slice(0, 10);
      const valid = goals.filter((g: Data) => g.start_date <= date && g.end_date >= date);
      const met = valid.filter((g: Data) => {
        const relevant = sales.filter((s: Data) => s.occurred_at?.slice(0,10) >= g.start_date && s.occurred_at?.slice(0,10) <= date);
        const value = g.metric === 'sales_count' ? relevant.length : g.metric === 'products_sold'
          ? relevant.reduce((sum: number, s: Data) => sum + (s.items || []).reduce((n: number, i: Data) => n + Number(i.quantity),0), 0)
          : relevant.reduce((sum: number, s: Data) => sum + Number(s.total), 0);
        return value >= Number(g.target_value);
      }).length;
      result.push({ day: date, applicable_count: valid.length, met_count: met, status: !valid.length ? 'neutral' : met === valid.length ? 'met' : 'missed' });
    }
    return ok(result);
  } catch (e: any) { return fail(e.message); }
}

/** Exports the existing typed interface for zero visual/component rewrites. */
export const supabase = new Proxy(backend, {
  get(target, prop, receiver) {
    if (prop === 'from') return (table: string) => {
      if (table === 'companies' || table === 'company_members' || table === 'user_profiles' || table === 'records' || table === 'company_invites' || table === 'contact_messages')
        return (target as any).from(table);
      return new MobileTableQuery(table);
    };
    if (prop === 'rpc') return (name: string, args: Data = {}) => {
      if (name === 'goal_progress') return progressGoal(args);
      if (name === 'employee_score') return scoreEmployee(args);
      if (name === 'dashboard_goal_calendar') return goalCalendar(args);
      if (name === 'claim_employee') return (async () => {
        try { const ctx = await context();
          const r = await (target as any).rpc('link_my_employee', { p_company: ctx.companyId, p_employee_id: args._employee_id });
          throwOnError(r); return ok((await linkedEmployees(ctx)).find(e => e.id === args._employee_id) || null);
        } catch(e: any) { return fail(e.message); }
      })();
      return (target as any).rpc(name, args);
    };
    return Reflect.get(target, prop, receiver);
  },
}) as typeof backend;

/** Called on first company creation to mirror the mobile onboarding defaults. */
export async function initializeCompany(id: string, name: string) {
  resetMobileDbCache();
  const ctx = await context();
  if (ctx.companyId !== id || !ctx.owner) throw new Error('Sem permissão para configurar a empresa.');
  await Promise.all([
    saveSetting('company', { ...emptyCompany, company_name: name }, ctx),
    saveSetting('roles', defaultRoles, ctx),
  ]);
}
