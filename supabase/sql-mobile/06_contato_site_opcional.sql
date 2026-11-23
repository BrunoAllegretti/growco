-- Opcional: conserva o formulário de contato do site institucional.
-- Separado dos dados administrativos e sem permissão pública de leitura.
CREATE TABLE IF NOT EXISTS public.contact_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(name) between 2 and 120),
 email text NOT NULL CHECK (length(email) between 5 and 320),
 company text CHECK (company IS NULL OR length(company) <= 120),
 message text NOT NULL CHECK (length(message) between 2 and 5000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.contact_messages TO anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.contact_messages FROM anon, authenticated;
DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;
CREATE POLICY contact_messages_public_insert ON public.contact_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
