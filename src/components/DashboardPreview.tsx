import { DashboardUI, type DashboardData } from "@/components/DashboardUI";

const previewData: DashboardData = {
  income: 128450,
  expense: 43280,
  profit: 85170,
  salesCount: 284,
  productsCount: 126,
  employeesCount: 18,
  lowStock: [],
  monthly: [
    { mes: "abr.", receita: 14500, despesa: 6900 },
    { mes: "mai.", receita: 18200, despesa: 7500 },
    { mes: "jun.", receita: 16700, despesa: 6300 },
    { mes: "jul.", receita: 22400, despesa: 8100 },
    { mes: "ago.", receita: 20500, despesa: 7800 },
    { mes: "set.", receita: 26150, despesa: 6680 },
  ],
  top: [
    { name: "Plano Premium", qty: 92 },
    { name: "Consultoria", qty: 66 },
    { name: "Produto Essencial", qty: 44 },
  ],
  goals: [
    {
      id: "preview-goal-sales",
      title: "Vendas",
      metric: "sales_count",
      target: 350,
      progress: 284,
    },
    {
      id: "preview-goal-revenue",
      title: "Receita gerada",
      metric: "sales_revenue",
      target: 180000,
      progress: 128450,
    },
  ],
  topEmployees: [
    {
      id: "preview-ana",
      full_name: "Ana Martins",
      role_title: "Comercial",
      avatar_url: null,
      score: 92,
    },
    {
      id: "preview-carlos",
      full_name: "Carlos Lima",
      role_title: "Vendas",
      avatar_url: null,
      score: 74,
    },
    {
      id: "preview-julia",
      full_name: "Júlia Rocha",
      role_title: "Sucesso do cliente",
      avatar_url: null,
      score: 61,
    },
  ],
  recentSales: [
    {
      id: "preview-sale-1",
      total: 3490,
      customer_name: "Grupo Horizonte",
      occurred_at: "2026-09-17T10:30:00.000Z",
      sale_items: [{ quantity: 1, products: { name: "Plano Premium" } }],
    },
    {
      id: "preview-sale-2",
      total: 1290,
      customer_name: "Mariana Costa",
      occurred_at: "2026-09-16T16:15:00.000Z",
      sale_items: [{ quantity: 2, products: { name: "Consultoria" } }],
    },
    {
      id: "preview-sale-3",
      total: 890,
      customer_name: null,
      occurred_at: "2026-09-16T11:45:00.000Z",
      sale_items: [{ quantity: 1, products: { name: "Produto Essencial" } }],
    },
  ],
};

/** Isolated mock entry point used only by /preview. */
export function DashboardPreview() {
  return <DashboardUI dashboard={previewData} showAdminMetrics />;
}
