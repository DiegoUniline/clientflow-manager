import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Wifi } from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import type { ServicePlan, ClientBilling } from '@/types/database';

interface ChangePlanDialogProps {
  clientId: string;
  clientName: string;
  currentBilling: ClientBilling | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ChangePlanDialog({ 
  clientId, 
  clientName,
  currentBilling, 
  open, 
  onOpenChange, 
  onSuccess 
}: ChangePlanDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Fetch available plans
  const { data: plans = [] } = useQuery({
    queryKey: ['service_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_fee');

      if (error) throw error;
      return data as ServicePlan[];
    },
    enabled: open,
  });

  // Fetch current plan details
  const { data: currentPlan } = useQuery({
    queryKey: ['service_plan', currentBilling?.plan_id],
    queryFn: async () => {
      if (!currentBilling?.plan_id) return null;
      const { data, error } = await supabase
        .from('service_plans')
        .select('*')
        .eq('id', currentBilling.plan_id)
        .single();

      if (error) throw error;
      return data as ServicePlan;
    },
    enabled: !!currentBilling?.plan_id && open,
  });

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const currentMonthlyFee = currentBilling?.monthly_fee || 0;
  const newMonthlyFee = selectedPlan?.monthly_fee || 0;
  const difference = newMonthlyFee - currentMonthlyFee;

  const handleSubmit = async () => {
    if (!selectedPlanId || !selectedPlan) {
      toast.error('Selecciona un plan');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update client_billing with new plan
      const { error: billingError } = await supabase
        .from('client_billing')
        .update({
          plan_id: selectedPlanId,
          monthly_fee: selectedPlan.monthly_fee,
        })
        .eq('client_id', clientId);

      if (billingError) throw billingError;

      // Register in plan_change_history
      const { error: historyError } = await supabase
        .from('plan_change_history')
        .insert({
          client_id: clientId,
          old_plan_id: currentBilling?.plan_id || null,
          new_plan_id: selectedPlanId,
          old_monthly_fee: currentMonthlyFee,
          new_monthly_fee: newMonthlyFee,
          effective_date: new Date().toISOString().split('T')[0],
          notes: notes || null,
          created_by: user?.id,
        });

      if (historyError) throw historyError;

      toast.success('Plan actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_billing'] });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al cambiar el plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Cambiar Plan de Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{clientName}</span>
          </div>

          {/* Current Plan */}
          <Card className="border-2">
            <CardContent className="pt-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Plan Actual
              </Label>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="font-semibold">
                    {currentPlan?.name || 'Sin plan asignado'}
                  </p>
                  {currentPlan && (
                    <p className="text-sm text-muted-foreground">
                      {currentPlan.speed_download} / {currentPlan.speed_upload}
                    </p>
                  )}
                </div>
                <p className="text-xl font-bold">{formatCurrency(currentMonthlyFee)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* New Plan Selection */}
          <div className="space-y-2">
            <Label>Nuevo Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un plan" />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter(p => p.id !== currentBilling?.plan_id)
                  .map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{plan.name}</span>
                        <span className="text-muted-foreground">
                          {plan.speed_download} - {formatCurrency(plan.monthly_fee)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Plan Preview */}
          {selectedPlan && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Nuevo Plan
                </Label>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="font-semibold">{selectedPlan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlan.speed_download} / {selectedPlan.speed_upload}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(newMonthlyFee)}</p>
                    {difference !== 0 && (
                      <Badge variant={difference > 0 ? 'destructive' : 'default'} className={difference < 0 ? 'bg-emerald-100 text-emerald-700' : ''}>
                        {difference > 0 ? '+' : ''}{formatCurrency(difference)}/mes
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Motivo del cambio de plan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedPlanId}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cambiar Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
