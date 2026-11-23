import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardUI, type CalendarGoalStatus, type DashboardData } from "@/components/DashboardUI";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/mobile-db";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function Dashboard() {
  const { isAdmin, companyId, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const monthRange = useMemo(() => {
    const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    return { start: toLocalDateKey(start), end: toLocalDateKey(end) };
  }, [calendarMonth]);

  const { data: calendarStatuses = [] } = useQuery<CalendarGoalStatus[]>({
    queryKey: ["dashboard-goal-calendar", companyId, monthRange.start, monthRange.end],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_goal_calendar", {
        _start: monthRange.start,
        _end: monthRange.end,
      });
      if (error) throw error;
      return (data ?? []).map((entry) => ({
        day: entry.day,
        status: entry.status as CalendarGoalStatus["status"],
        applicableCount: entry.applicable_count,
        metCount: entry.met_count,
      }));
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard", companyId, selectedDate],
    queryFn: async () => {
      const selectedStart = new Date(`${selectedDate}T00:00:00`);
      const selectedEnd = new Date(selectedStart);
      selectedEnd.setDate(selectedEnd.getDate() + 1);
      const historyStart = new Date(selectedStart.getFullYear(), selectedStart.getMonth() - 11, 1);
      const [dayTransactions, daySales, historyTransactions, products, employees, goals] =
        await Promise.all([
          supabase
            .from("transactions")
            .select("type, amount, occurred_at")
            .eq("occurred_at", selectedDate),
          supabase
            .from("sales")
            .select("id, total, customer_name, occurred_at, sale_items(quantity, products(name))")
            .gte("occurred_at", selectedStart.toISOString())
            .lt("occurred_at", selectedEnd.toISOString())
            .order("occurred_at", { ascending: false }),
          supabase
            .from("transactions")
            .select("type, amount, occurred_at")
            .gte("occurred_at", toLocalDateKey(historyStart))
            .lte("occurred_at", selectedDate),
          supabase.from("products").select("id, name, stock, min_stock, price"),
          supabase
            .from("employees")
            .select("id, full_name, role_title, avatar_url, active")
            .eq("active", true),
          supabase
            .from("goals")
            .select("id, title, metric, target_value")
            .eq("active", true)
            .order("created_at", { ascending: false }),
        ]);

      const transactions = dayTransactions.data ?? [];
      const sales = daySales.data ?? [];
      const income = transactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const expense = transactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);
      const lowStock = (products.data ?? []).filter(
        (product) => product.stock <= product.min_stock,
      );
      const productMap: Record<string, { name: string; qty: number }> = {};
      let productsSold = 0;
      sales.forEach((sale) =>
        sale.sale_items.forEach((item) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const name = product?.name ?? "—";
          productsSold += item.quantity;
          if (!productMap[name]) productMap[name] = { name, qty: 0 };
          productMap[name].qty += item.quantity;
        }),
      );
      const top = Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const goalProgressEntries = await Promise.all(
        (goals.data ?? []).slice(0, 2).map(async (goal) => {
          const { data: progress } = await supabase.rpc("goal_progress", { _goal_id: goal.id });
          return {
            id: goal.id,
            title: goal.title,
            metric: goal.metric,
            target: Number(goal.target_value),
            progress: Number(progress ?? 0),
          };
        }),
      );
      const employeeScores = await Promise.all(
        (employees.data ?? []).map(async (employee) => {
          const { data: score } = await supabase.rpc("employee_score", {
            _employee_id: employee.id,
            _start: selectedDate,
            _end: selectedDate,
          });
          return { ...employee, score: Number(score ?? 0) };
        }),
      );

      const months: Record<string, { mes: string; receita: number; despesa: number }> = {};
      for (let index = 11; index >= 0; index--) {
        const date = new Date(selectedStart.getFullYear(), selectedStart.getMonth() - index, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        months[key] = {
          mes: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
          receita: 0,
          despesa: 0,
        };
      }
      (historyTransactions.data ?? []).forEach((item) => {
        const key = item.occurred_at.slice(0, 7);
        if (months[key])
          months[key][item.type === "income" ? "receita" : "despesa"] += Number(item.amount);
      });
      const cashFlow: DashboardData["cashFlow"] = (historyTransactions.data ?? []).map((item) => ({
        type: item.type as "income" | "expense",
        amount: Number(item.amount),
        occurred_at: item.occurred_at,
      }));

      return {
        income,
        expense,
        profit: income - expense,
        salesCount: sales.length,
        productsCount: productsSold,
        employeesCount: employees.data?.length ?? 0,
        selectedDate,
        topEmployees: employeeScores.sort((a, b) => b.score - a.score).slice(0, 3),
        lowStock,
        monthly: Object.values(months),
        cashFlow,
        top,
        goals: goalProgressEntries,
        recentSales: sales.slice(0, 8),
      };
    },
    enabled: !!companyId,
  });

  return (
    <DashboardUI
      dashboard={data}
      loading={isLoading}
      showAdminMetrics={isAdmin}
      selectedDate={selectedDate}
      onSelectedDateChange={setSelectedDate}
      calendarMonth={calendarMonth}
      onCalendarMonthChange={setCalendarMonth}
      calendarStatuses={calendarStatuses}
    />
  );
}
