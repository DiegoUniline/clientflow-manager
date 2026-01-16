import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, ArrowRight } from 'lucide-react';
import type { ClientBilling } from '@/types/database';

interface ChangeBillingDayDialogProps {
  clientId: string;
  clientName: string;
  currentBilling: ClientBilling | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChangeBillingDayDialog({ 
  clientId, 
  clientName,
  currentBilling, 
  open, 
  onOpenChange, 
  onSuccess 
}: ChangeBillingDayDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBillingDay, setNewBillingDay] = useState(currentBilling?.billing_day?.toString() || '10');

  const currentDay = currentBilling?.billing_day || 10;
  const parsedNewDay = parseInt(newBillingDay);
  const isValid = parsedNewDay >= 1 && parsedNewDay <= 28;
  const hasChanged = parsedNewDay !== currentDay;

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error('El día de corte debe ser entre 1 y 28');
      return;
    }

    if (!hasChanged) {
      toast.info('El día de corte no ha cambiado');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('client_billing')
        .update({ billing_day: parsedNewDay })
        .eq('client_id', clientId);

      if (error) throw error;

      toast.success('Día de corte actualizado');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_billing'] });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al actualizar el día de corte');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cambiar Día de Corte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{clientName}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Current Day */}
            <Card className="flex-1 border-2">
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Día Actual
                </p>
                <p className="text-3xl font-bold">{currentDay}</p>
              </CardContent>
            </Card>

            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

            {/* New Day */}
            <Card className={`flex-1 border-2 ${hasChanged && isValid ? 'border-primary/50 bg-primary/5' : ''}`}>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Nuevo Día
                </p>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={newBillingDay}
                  onChange={(e) => setNewBillingDay(e.target.value)}
                  className="text-center text-2xl font-bold h-12"
                />
              </CardContent>
            </Card>
          </div>

          {!isValid && newBillingDay && (
            <p className="text-sm text-destructive text-center">
              El día debe ser entre 1 y 28
            </p>
          )}

          <p className="text-sm text-muted-foreground text-center">
            El día de corte determina cuándo se genera el cargo mensual del cliente.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !isValid || !hasChanged}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
