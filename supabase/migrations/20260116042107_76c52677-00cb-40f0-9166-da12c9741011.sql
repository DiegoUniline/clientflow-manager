-- Catálogo de tipos de cargos
CREATE TABLE public.charge_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cargos adicionales a clientes
CREATE TABLE public.client_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  charge_catalog_id UUID REFERENCES public.charge_catalog(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  due_date DATE,
  paid_date DATE,
  payment_id UUID REFERENCES public.payments(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notas de clientes
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.charge_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Policies for charge_catalog (read-only for all, admin can manage)
CREATE POLICY "Authenticated users can view charge catalog" ON public.charge_catalog FOR SELECT USING (true);
CREATE POLICY "Only admins can insert charge catalog" ON public.charge_catalog FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Only admins can update charge catalog" ON public.charge_catalog FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can delete charge catalog" ON public.charge_catalog FOR DELETE USING (is_admin(auth.uid()));

-- Policies for client_charges
CREATE POLICY "Authenticated users can view client charges" ON public.client_charges FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert client charges" ON public.client_charges FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update client charges" ON public.client_charges FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can delete client charges" ON public.client_charges FOR DELETE USING (is_admin(auth.uid()));

-- Policies for client_notes
CREATE POLICY "Authenticated users can view client notes" ON public.client_notes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert client notes" ON public.client_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update client notes" ON public.client_notes FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Only admins can delete client notes" ON public.client_notes FOR DELETE USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_client_charges_updated_at BEFORE UPDATE ON public.client_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_notes_updated_at BEFORE UPDATE ON public.client_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default charge catalog items
INSERT INTO public.charge_catalog (name, description, default_amount) VALUES
  ('Reconexión', 'Cargo por reconexión del servicio', 100),
  ('Cambio de equipo', 'Cargo por cambio de equipo/antena', 200),
  ('Visita técnica', 'Cargo por visita técnica a domicilio', 150),
  ('Reposición de router', 'Cargo por reposición de router dañado', 350),
  ('Reposición de antena', 'Cargo por reposición de antena dañada', 500),
  ('Cambio de ubicación', 'Cargo por cambio de ubicación del servicio', 300);