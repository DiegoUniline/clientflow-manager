-- Agregar campo assigned_to a prospects para asignar técnico
ALTER TABLE public.prospects 
ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

-- Agregar índice para consultas eficientes
CREATE INDEX idx_prospects_assigned_to ON public.prospects(assigned_to);