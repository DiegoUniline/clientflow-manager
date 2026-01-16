-- Agregar día de corte al billing
ALTER TABLE public.client_billing 
ADD COLUMN billing_day integer DEFAULT 10 CHECK (billing_day >= 1 AND billing_day <= 28);

-- Agregar campo para el monto prorrateado inicial
ALTER TABLE public.client_billing 
ADD COLUMN prorated_amount numeric DEFAULT 0;

-- Agregar campos adicionales de cargos
ALTER TABLE public.client_billing 
ADD COLUMN additional_charges numeric DEFAULT 0;

ALTER TABLE public.client_billing 
ADD COLUMN additional_charges_notes text;

-- Agregar número de serie a equipo
ALTER TABLE public.equipment 
ADD COLUMN antenna_serial text;