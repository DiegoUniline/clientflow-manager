-- Tabla de planes de servicio
CREATE TABLE public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL,
  speed_download TEXT,
  speed_upload TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_service_plans_updated_at
  BEFORE UPDATE ON public.service_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para service_plans
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active plans"
  ON public.service_plans FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert plans"
  ON public.service_plans FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update plans"
  ON public.service_plans FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete plans"
  ON public.service_plans FOR DELETE
  USING (is_admin(auth.uid()));

-- Agregar plan_id a client_billing
ALTER TABLE public.client_billing
  ADD COLUMN plan_id UUID REFERENCES public.service_plans(id);

-- Tabla de historial de equipos
CREATE TABLE public.equipment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id),
  change_type TEXT NOT NULL, -- 'installation', 'antenna_change', 'router_change', 'relocation'
  old_values JSONB,
  new_values JSONB,
  charge_id UUID REFERENCES public.client_charges(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para equipment_history
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view equipment history"
  ON public.equipment_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert equipment history"
  ON public.equipment_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can update equipment history"
  ON public.equipment_history FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete equipment history"
  ON public.equipment_history FOR DELETE
  USING (is_admin(auth.uid()));

-- Tabla de historial de cambios de plan
CREATE TABLE public.plan_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  old_plan_id UUID REFERENCES public.service_plans(id),
  new_plan_id UUID REFERENCES public.service_plans(id),
  old_monthly_fee NUMERIC,
  new_monthly_fee NUMERIC,
  effective_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para plan_change_history
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plan history"
  ON public.plan_change_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert plan history"
  ON public.plan_change_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can update plan history"
  ON public.plan_change_history FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete plan history"
  ON public.plan_change_history FOR DELETE
  USING (is_admin(auth.uid()));

-- Insertar planes de ejemplo
INSERT INTO public.service_plans (name, monthly_fee, speed_download, speed_upload, description) VALUES
  ('Plan Básico', 350, '10 Mbps', '5 Mbps', 'Internet básico para navegación y redes sociales'),
  ('Plan Estándar', 450, '25 Mbps', '10 Mbps', 'Internet para streaming y trabajo desde casa'),
  ('Plan Premium', 600, '50 Mbps', '25 Mbps', 'Internet de alta velocidad para múltiples dispositivos'),
  ('Plan Empresarial', 900, '100 Mbps', '50 Mbps', 'Internet empresarial con prioridad de soporte');

-- Insertar cargos adicionales al catálogo
INSERT INTO public.charge_catalog (name, default_amount, description) VALUES
  ('Cambio de antena', 500, 'Cargo por cambio de antena'),
  ('Cambio de router', 300, 'Cargo por cambio de router'),
  ('Reinstalación por cambio de domicilio', 800, 'Cargo por reinstalación en nueva ubicación'),
  ('Reconexión de servicio', 200, 'Cargo por reconexión después de suspensión')
ON CONFLICT DO NOTHING;