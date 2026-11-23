export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          name: string;
          type: Database["public"]["Enums"]["tx_type"];
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
          type: Database["public"]["Enums"]["tx_type"];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["tx_type"];
        };
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          created_at: string;
          id: string;
          invite_code: string;
          name: string;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invite_code?: string;
          name: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invite_code?: string;
          name?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          company_id: string;
          id: string;
          joined_at: string;
          role: Database["public"]["Enums"]["company_role"];
          user_id: string;
        };
        Insert: {
          company_id: string;
          id?: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["company_role"];
          user_id: string;
        };
        Update: {
          company_id?: string;
          id?: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["company_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_roles: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          title: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          title: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      company_settings: {
        Row: {
          address: string | null;
          close_time: string | null;
          cnpj: string | null;
          company_id: string;
          company_name: string;
          email: string | null;
          high_expense_alert: number;
          id: string;
          logo_url: string | null;
          low_stock_alert: number;
          open_time: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          close_time?: string | null;
          cnpj?: string | null;
          company_id: string;
          company_name?: string;
          email?: string | null;
          high_expense_alert?: number;
          id?: string;
          logo_url?: string | null;
          low_stock_alert?: number;
          open_time?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          close_time?: string | null;
          cnpj?: string | null;
          company_id?: string;
          company_name?: string;
          email?: string | null;
          high_expense_alert?: number;
          id?: string;
          logo_url?: string | null;
          low_stock_alert?: number;
          open_time?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_messages: {
        Row: {
          company: string | null;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      employee_badges: {
        Row: {
          badge_code: string;
          company_id: string;
          employee_id: string;
          id: string;
          unlocked_at: string;
        };
        Insert: {
          badge_code: string;
          company_id: string;
          employee_id: string;
          id?: string;
          unlocked_at?: string;
        };
        Update: {
          badge_code?: string;
          company_id?: string;
          employee_id?: string;
          id?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_badges_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_badges_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          company_id: string;
          created_at: string;
          department_id: string | null;
          email: string | null;
          full_name: string;
          hire_date: string;
          id: string;
          role_title: string;
          salary: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string | null;
          company_id: string;
          created_at?: string;
          department_id?: string | null;
          email?: string | null;
          full_name: string;
          hire_date?: string;
          id?: string;
          role_title: string;
          salary?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          avatar_url?: string | null;
          company_id?: string;
          created_at?: string;
          department_id?: string | null;
          email?: string | null;
          full_name?: string;
          hire_date?: string;
          id?: string;
          role_title?: string;
          salary?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          active: boolean;
          assignee_id: string | null;
          assignee_type: Database["public"]["Enums"]["goal_assignee"];
          company_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          end_date: string;
          id: string;
          metric: Database["public"]["Enums"]["goal_metric"];
          period: Database["public"]["Enums"]["goal_period"];
          start_date: string;
          target_value: number;
          title: string;
        };
        Insert: {
          active?: boolean;
          assignee_id?: string | null;
          assignee_type: Database["public"]["Enums"]["goal_assignee"];
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date: string;
          id?: string;
          metric: Database["public"]["Enums"]["goal_metric"];
          period: Database["public"]["Enums"]["goal_period"];
          start_date: string;
          target_value: number;
          title: string;
        };
        Update: {
          active?: boolean;
          assignee_id?: string | null;
          assignee_type?: Database["public"]["Enums"]["goal_assignee"];
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string;
          id?: string;
          metric?: Database["public"]["Enums"]["goal_metric"];
          period?: Database["public"]["Enums"]["goal_period"];
          start_date?: string;
          target_value?: number;
          title?: string;
        };
        Relationships: [];
      };
      performance_settings: {
        Row: {
          company_id: string;
          gamification_enabled: boolean;
          ranking_enabled: boolean;
          ranking_public: boolean;
          updated_at: string;
          weights: Json;
        };
        Insert: {
          company_id: string;
          gamification_enabled?: boolean;
          ranking_enabled?: boolean;
          ranking_public?: boolean;
          updated_at?: string;
          weights?: Json;
        };
        Update: {
          company_id?: string;
          gamification_enabled?: boolean;
          ranking_enabled?: boolean;
          ranking_public?: boolean;
          updated_at?: string;
          weights?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "performance_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          company_id: string;
          cost: number;
          created_at: string;
          id: string;
          min_stock: number;
          name: string;
          price: number;
          sku: string | null;
          stock: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          company_id: string;
          cost?: number;
          created_at?: string;
          id?: string;
          min_stock?: number;
          name: string;
          price?: number;
          sku?: string | null;
          stock?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          cost?: number;
          created_at?: string;
          id?: string;
          min_stock?: number;
          name?: string;
          price?: number;
          sku?: string | null;
          stock?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      salary_payments: {
        Row: {
          amount: number;
          company_id: string;
          created_at: string;
          employee_id: string;
          id: string;
          notes: string | null;
          paid: boolean;
          paid_at: string | null;
          reference_month: string;
        };
        Insert: {
          amount: number;
          company_id: string;
          created_at?: string;
          employee_id: string;
          id?: string;
          notes?: string | null;
          paid?: boolean;
          paid_at?: string | null;
          reference_month: string;
        };
        Update: {
          amount?: number;
          company_id?: string;
          created_at?: string;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          paid?: boolean;
          paid_at?: string | null;
          reference_month?: string;
        };
        Relationships: [
          {
            foreignKeyName: "salary_payments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "salary_payments_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          company_id: string;
          id: string;
          product_id: string;
          quantity: number;
          sale_id: string;
          subtotal: number | null;
          unit_price: number;
        };
        Insert: {
          company_id: string;
          id?: string;
          product_id: string;
          quantity: number;
          sale_id: string;
          subtotal?: number | null;
          unit_price: number;
        };
        Update: {
          company_id?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          sale_id?: string;
          subtotal?: number | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          customer_name: string | null;
          id: string;
          occurred_at: string;
          paid: boolean;
          paid_at: string | null;
          total: number;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string | null;
          id?: string;
          occurred_at?: string;
          paid?: boolean;
          paid_at?: string | null;
          total?: number;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          customer_name?: string | null;
          id?: string;
          occurred_at?: string;
          paid?: boolean;
          paid_at?: string | null;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          product_id: string;
          quantity: number;
          reason: string | null;
          type: Database["public"]["Enums"]["stock_move_type"];
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          product_id: string;
          quantity: number;
          reason?: string | null;
          type: Database["public"]["Enums"]["stock_move_type"];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          type?: Database["public"]["Enums"]["stock_move_type"];
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          company_id: string;
          created_at: string;
          employee_id: string;
          id: string;
          team_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          employee_id: string;
          id?: string;
          team_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          employee_id?: string;
          id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          clock_in: string;
          clock_out: string | null;
          company_id: string;
          created_at: string;
          employee_id: string;
          hours: number | null;
          id: string;
        };
        Insert: {
          clock_in?: string;
          clock_out?: string | null;
          company_id: string;
          created_at?: string;
          employee_id: string;
          hours?: number | null;
          id?: string;
        };
        Update: {
          clock_in?: string;
          clock_out?: string | null;
          company_id?: string;
          created_at?: string;
          employee_id?: string;
          hours?: number | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          category_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          occurred_at: string;
          salary_payment_id: string | null;
          type: Database["public"]["Enums"]["tx_type"];
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          occurred_at?: string;
          salary_payment_id?: string | null;
          type: Database["public"]["Enums"]["tx_type"];
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          occurred_at?: string;
          salary_payment_id?: string | null;
          type?: Database["public"]["Enums"]["tx_type"];
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_salary_payment_id_fkey";
            columns: ["salary_payment_id"];
            isOneToOne: false;
            referencedRelation: "salary_payments";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      award_employee_badges: {
        Args: { _employee_id: string };
        Returns: undefined;
      };
      claim_employee: {
        Args: { _employee_id: string };
        Returns: {
          active: boolean;
          avatar_url: string | null;
          company_id: string;
          created_at: string;
          department_id: string | null;
          email: string | null;
          full_name: string;
          hire_date: string;
          id: string;
          role_title: string;
          salary: number;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "employees";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_company: { Args: { _name: string }; Returns: string };
      current_company_id: { Args: never; Returns: string };
      dashboard_goal_calendar: {
        Args: { _end: string; _start: string };
        Returns: {
          applicable_count: number;
          day: string;
          met_count: number;
          status: string;
        }[];
      };
      employee_score: {
        Args: { _employee_id: string; _end: string; _start: string };
        Returns: number;
      };
      goal_progress: { Args: { _goal_id: string }; Returns: number };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_company_member: { Args: { _company_id: string }; Returns: boolean };
      is_company_owner: { Args: { _company_id: string }; Returns: boolean };
      join_company_by_code: { Args: { _code: string }; Returns: string };
      update_my_employee_profile: {
        Args: { _avatar_url: string | null; _full_name: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "employee";
      company_role: "owner" | "employee";
      goal_assignee: "employee" | "team" | "company";
      goal_metric: "sales_revenue" | "sales_count" | "products_sold";
      goal_period: "daily" | "weekly" | "monthly" | "yearly" | "custom";
      stock_move_type: "in" | "out";
      tx_type: "income" | "expense";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee"],
      company_role: ["owner", "employee"],
      goal_assignee: ["employee", "team", "company"],
      goal_metric: ["sales_revenue", "sales_count", "products_sold"],
      goal_period: ["daily", "weekly", "monthly", "yearly", "custom"],
      stock_move_type: ["in", "out"],
      tx_type: ["income", "expense"],
    },
  },
} as const;
