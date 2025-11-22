-- Allow super_admin to see and manage atendimentos and mensagens

-- Update atendimentos policies
DROP POLICY IF EXISTS "Users can view atendimentos based on role" ON public.atendimentos;
CREATE POLICY "Users can view atendimentos based on role" ON public.atendimentos
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Users can update atendimentos based on role" ON public.atendimentos;
CREATE POLICY "Users can update atendimentos based on role" ON public.atendimentos
FOR UPDATE USING (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

-- Update mensagens policies
DROP POLICY IF EXISTS "Users can view mensagens from their atendimentos" ON public.mensagens;
CREATE POLICY "Users can view mensagens from their atendimentos" ON public.mensagens
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Users can insert mensagens" ON public.mensagens;
CREATE POLICY "Users can insert mensagens" ON public.mensagens
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.mensagens;
CREATE POLICY "Users can mark messages as read" ON public.mensagens
FOR UPDATE USING (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

-- Update status_atendimento select policy
DROP POLICY IF EXISTS "Users can view status changes" ON public.status_atendimento;
CREATE POLICY "Users can view status changes" ON public.status_atendimento
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

-- Update intervencoes select/insert policies to include super_admin
DROP POLICY IF EXISTS "Users can view intervencoes" ON public.intervencoes;
CREATE POLICY "Users can view intervencoes" ON public.intervencoes
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Users can create intervencoes" ON public.intervencoes;
CREATE POLICY "Users can create intervencoes" ON public.intervencoes
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'supervisor') OR
  has_role(auth.uid(), 'vendedor') OR
  has_role(auth.uid(), 'super_admin')
);
