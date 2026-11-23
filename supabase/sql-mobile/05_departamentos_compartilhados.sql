-- Execute após 01, 02, 03 e 04, no MESMO projeto Supabase do aplicativo.
-- A versão móvel já possui 'departments' na camada de dados, mas a constraint
-- original da tabela records não permite persistir esse tipo de registro.
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_kind_check;
ALTER TABLE public.records ADD CONSTRAINT records_kind_check CHECK (
  kind IN ('products', 'moves', 'sales', 'transactions', 'employees',
    'payments', 'teams', 'goals', 'timeEntries', 'settings', 'departments')
);

CREATE OR REPLACE FUNCTION public.can_edit_record(p_company uuid, p_kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_company_owner(p_company)
     AND p_kind IN ('employees', 'payments', 'teams', 'goals',
       'settings', 'transactions', 'departments');
$$;
REVOKE ALL ON FUNCTION public.can_edit_record(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_record(uuid, text) TO authenticated;

DROP POLICY IF EXISTS records_read ON public.records;
CREATE POLICY records_read ON public.records FOR SELECT TO authenticated USING (
  public.is_company_member(company_id)
  AND (
    public.is_company_owner(company_id)
    OR kind IN ('products', 'moves', 'sales', 'goals', 'teams', 'settings', 'departments')
    OR (kind = 'timeEntries' AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.company_id = records.company_id
        AND p.user_id = (SELECT auth.uid())
        AND p.employee_id = records.data->>'employee_id'
    ))
  )
);
