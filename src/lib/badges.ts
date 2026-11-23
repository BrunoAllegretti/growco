export type BadgeDef = {
  code: string;
  name: string;
  description: string;
  sector: "vendas" | "estoque" | "financeiro" | "atendimento";
  color: string;
};

export const BADGES: BadgeDef[] = [
  // Vendas
  { code: "sales_first", name: "Primeira Venda", description: "Realizar a primeira venda", sector: "vendas", color: "bg-emerald-500" },
  { code: "sales_rising", name: "Vendedor em Ascensão", description: "50 vendas realizadas", sector: "vendas", color: "bg-emerald-600" },
  { code: "sales_master", name: "Mestre das Vendas", description: "100 vendas realizadas", sector: "vendas", color: "bg-amber-500" },
  { code: "sales_legend", name: "Lenda Comercial", description: "Ultrapassar R$ 1.000.000 em vendas", sector: "vendas", color: "bg-yellow-400" },
  { code: "sales_streak", name: "Sequência Perfeita", description: "Bater meta por 6 meses consecutivos", sector: "vendas", color: "bg-purple-500" },
  // Estoque
  { code: "stock_first", name: "Primeiro Cadastro", description: "Cadastrar o primeiro produto", sector: "estoque", color: "bg-sky-500" },
  { code: "stock_organizer", name: "Organizador", description: "100 produtos cadastrados", sector: "estoque", color: "bg-sky-600" },
  { code: "stock_precision", name: "Precisão Máxima", description: "30 dias sem divergência de estoque", sector: "estoque", color: "bg-cyan-500" },
  { code: "stock_inventory_master", name: "Mestre do Inventário", description: "Concluir 10 inventários", sector: "estoque", color: "bg-indigo-500" },
  { code: "stock_guardian", name: "Guardião do Estoque", description: "90 dias sem erros registrados", sector: "estoque", color: "bg-blue-600" },
  // Financeiro
  { code: "fin_first", name: "Primeira Conciliação", description: "Realizar a primeira conciliação", sector: "financeiro", color: "bg-rose-500" },
  { code: "fin_specialist", name: "Especialista Financeiro", description: "500 movimentações processadas", sector: "financeiro", color: "bg-rose-600" },
  { code: "fin_precision", name: "Precisão Total", description: "60 dias sem erros", sector: "financeiro", color: "bg-pink-500" },
  { code: "fin_master", name: "Mestre Financeiro", description: "Fechar 12 meses consecutivos", sector: "financeiro", color: "bg-fuchsia-600" },
  // Atendimento
  { code: "att_first", name: "Primeiro Atendimento", description: "Concluir o primeiro atendimento", sector: "atendimento", color: "bg-orange-500" },
  { code: "att_happy", name: "Cliente Feliz", description: "Média de avaliação acima de 4,8", sector: "atendimento", color: "bg-amber-400" },
  { code: "att_specialist", name: "Especialista em Suporte", description: "500 chamados resolvidos", sector: "atendimento", color: "bg-orange-600" },
  { code: "att_fast", name: "Resposta Relâmpago", description: "Tempo médio abaixo da meta por 30 dias", sector: "atendimento", color: "bg-yellow-500" },
];

export const SECTOR_LABEL: Record<BadgeDef["sector"], string> = {
  vendas: "Vendas",
  estoque: "Estoque",
  financeiro: "Financeiro",
  atendimento: "Atendimento",
};