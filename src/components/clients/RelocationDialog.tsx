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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import type { Client, Equipment } from '@/types/database';

interface RelocationDialogProps {
  client: Client;
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RelocationDialog({ 
  client, 
  equipment, 
  open, 
  onOpenChange, 
  onSuccess 
}: RelocationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generateCharge, setGenerateCharge] = useState(true);
  const [selectedChargeId, setSelectedChargeId] = useState<string>('');
  const [chargeAmount, setChargeAmount] = useState('800');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  // New address
  const [newAddress, setNewAddress] = useState({
    street: '',
    exterior_number: '',
    interior_number: '',
    neighborhood: '',
    city: client.city || '',
    postal_code: '',
  });

  // Fetch charge catalog
  const { data: chargeCatalog = [] } = useQuery({
    queryKey: ['charge_catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charge_catalog')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSelectCharge = (catalogId: string) => {
    setSelectedChargeId(catalogId);
    const selected = chargeCatalog.find((c: any) => c.id === catalogId);
    if (selected) {
      setChargeAmount(selected.default_amount.toString());
    }
  };

  const handleSubmit = async () => {
    if (!newAddress.street || !newAddress.exterior_number || !newAddress.neighborhood) {
      toast.error('Completa los campos requeridos de la nueva dirección');
      return;
    }

    setIsSubmitting(true);
    try {
      const oldAddress = {
        street: client.street,
        exterior_number: client.exterior_number,
        interior_number: client.interior_number,
        neighborhood: client.neighborhood,
        city: client.city,
        postal_code: client.postal_code,
      };

      // Update client address
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          street: newAddress.street,
          exterior_number: newAddress.exterior_number,
          interior_number: newAddress.interior_number || null,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city,
          postal_code: newAddress.postal_code || null,
        })
        .eq('id', client.id);

      if (clientError) throw clientError;

      let chargeId: string | null = null;

      // Create charge if needed
      if (generateCharge && chargeAmount) {
        const amount = parseFloat(chargeAmount);
        if (amount > 0) {
          const { data: chargeData, error: chargeError } = await supabase
            .from('client_charges')
            .insert({
              client_id: client.id,
              charge_catalog_id: selectedChargeId || null,
              description: 'Reinstalación por cambio de domicilio',
              amount,
              status: 'pending',
              created_by: user?.id,
            })
            .select()
            .single();

          if (chargeError) throw chargeError;
          chargeId = chargeData.id;

          // Update balance
          const { data: billing } = await supabase
            .from('client_billing')
            .select('balance')
            .eq('client_id', client.id)
            .single();

          if (billing) {
            const { error: balanceError } = await supabase
              .from('client_billing')
              .update({ balance: (billing.balance || 0) + amount })
              .eq('client_id', client.id);

            if (balanceError) throw balanceError;
          }
        }
      }

      // Register in equipment_history
      const { error: historyError } = await supabase
        .from('equipment_history')
        .insert({
          client_id: client.id,
          equipment_id: equipment?.id || null,
          change_type: 'relocation',
          old_values: { address: oldAddress, scheduled_date: scheduledDate || null },
          new_values: { address: newAddress, scheduled_date: scheduledDate || null },
          charge_id: chargeId,
          notes: notes || null,
          created_by: user?.id,
        });

      if (historyError) throw historyError;

      toast.success('Cambio de domicilio registrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client_charges'] });
      queryClient.invalidateQueries({ queryKey: ['client_billing'] });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al registrar el cambio de domicilio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientName = `${client.first_name} ${client.last_name_paterno}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Cambio de Domicilio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium text-foreground">{clientName}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Current Address */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{client.street} {client.exterior_number}{client.interior_number ? ` Int. ${client.interior_number}` : ''}</p>
                <p>{client.neighborhood}</p>
                <p>{client.city}{client.postal_code ? `, C.P. ${client.postal_code}` : ''}</p>
              </CardContent>
            </Card>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <ArrowRight className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* New Address */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Nueva Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Calle *</Label>
                  <Input 
                    value={newAddress.street} 
                    onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Núm. Ext. *</Label>
                  <Input 
                    value={newAddress.exterior_number} 
                    onChange={(e) => setNewAddress(prev => ({ ...prev, exterior_number: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Núm. Int.</Label>
                  <Input 
                    value={newAddress.interior_number} 
                    onChange={(e) => setNewAddress(prev => ({ ...prev, interior_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Colonia *</Label>
                  <Input 
                    value={newAddress.neighborhood} 
                    onChange={(e) => setNewAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input 
                    value={newAddress.city} 
                    onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código Postal</Label>
                  <Input 
                    value={newAddress.postal_code} 
                    onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fecha Programada</Label>
                  <Input 
                    type="date"
                    value={scheduledDate} 
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Charge Options */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="generateCharge" 
                  checked={generateCharge} 
                  onCheckedChange={(checked) => setGenerateCharge(checked as boolean)}
                />
                <Label htmlFor="generateCharge">Generar cargo por reinstalación</Label>
              </div>

              {generateCharge && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <Label>Tipo de cargo</Label>
                    <Select value={selectedChargeId} onValueChange={handleSelectCharge}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chargeCatalog.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({formatCurrency(item.default_amount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Información adicional sobre el cambio de domicilio..."
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar Cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
