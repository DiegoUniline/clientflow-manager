import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addMonths, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, MapPin, Phone, FileText, Wifi, CreditCard, Image, Calculator, Calendar, DollarSign, Clock, Receipt, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/billing';
import type { Client, ClientBilling, Equipment, Payment } from '@/types/database';

type ClientWithDetails = Client & {
  client_billing: ClientBilling | null;
  equipment: Equipment[];
};

interface ClientDetailDialogProps {
  client: ClientWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Función para calcular la próxima fecha de cobro
function getNextBillingDate(billingDay: number): Date {
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let nextBilling = new Date(currentYear, currentMonth, billingDay);
  
  if (isBefore(nextBilling, today) || nextBilling.getTime() === today.getTime()) {
    nextBilling = addMonths(nextBilling, 1);
  }
  
  return nextBilling;
}

export function ClientDetailDialog({ client, open, onOpenChange }: ClientDetailDialogProps) {
  const [selectedTab, setSelectedTab] = useState('resumen');

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', client.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!client?.id && open,
  });

  if (!client) return null;

  const billing = client.client_billing as any;
  const equipment = client.equipment?.[0] as any;
  const billingDay = billing?.billing_day || 10;
  const nextBillingDate = getNextBillingDate(billingDay);

  // Calcular meses de servicio
  const installDate = billing?.installation_date ? new Date(billing.installation_date) : null;
  const monthsOfService = installDate 
    ? Math.floor((new Date().getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  // Total pagado
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const getDocumentUrl = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const handleDownloadDocument = async (path: string | null) => {
    if (!path) return;
    const url = await getDocumentUrl(path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {client.first_name} {client.last_name_paterno} {client.last_name_materno || ''}
              </DialogTitle>
              <p className="text-muted-foreground">{client.phone1}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={client.status === 'active' ? 'default' : 'destructive'} className="text-sm">
                {client.status === 'active' ? 'Activo' : 'Cancelado'}
              </Badge>
              {(billing?.balance || 0) > 0 && (
                <Badge variant="destructive" className="bg-red-100 text-red-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Con Adeudo
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
            <TabsTrigger value="info">Info Personal</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          {/* TAB RESUMEN */}
          <TabsContent value="resumen" className="space-y-4">
            {/* Cards principales */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-medium">Mensualidad</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(billing?.monthly_fee || 0)}</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Próximo Cobro</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">
                    {format(nextBillingDate, 'dd MMM yyyy', { locale: es })}
                  </p>
                  <p className="text-xs text-blue-600">Día de corte: {billingDay}</p>
                </CardContent>
              </Card>

              <Card className={(billing?.balance || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
                <CardContent className="pt-4">
                  <div className={`flex items-center gap-2 mb-1 ${(billing?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-medium">Saldo Actual</span>
                  </div>
                  <p className={`text-2xl font-bold ${(billing?.balance || 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatCurrency(billing?.balance || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Antigüedad</span>
                  </div>
                  <p className="text-2xl font-bold">{monthsOfService}</p>
                  <p className="text-xs text-muted-foreground">meses de servicio</p>
                </CardContent>
              </Card>
            </div>

            {/* Desglose de cargos */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Desglose de Cargos Iniciales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prorrateo (primer mes):</span>
                    <span className="font-medium">{formatCurrency(billing?.prorated_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Costo de instalación:</span>
                    <span className="font-medium">{formatCurrency(billing?.installation_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Cargos adicionales:</span>
                    <span className="font-medium">{formatCurrency(billing?.additional_charges || 0)}</span>
                  </div>
                  {billing?.additional_charges_notes && (
                    <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded">
                      {billing.additional_charges_notes}
                    </p>
                  )}
                  <div className="flex justify-between py-2 text-lg font-bold">
                    <span>Cargo Inicial Total:</span>
                    <span className="text-primary">
                      {formatCurrency(
                        (billing?.prorated_amount || 0) + 
                        (billing?.installation_cost || 0) + 
                        (billing?.additional_charges || 0)
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Resumen de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total pagos realizados:</span>
                    <span className="font-medium">{payments.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Monto total pagado:</span>
                    <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Fecha de instalación:</span>
                    <span className="font-medium">
                      {billing?.installation_date 
                        ? format(new Date(billing.installation_date), 'dd MMM yyyy', { locale: es })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Primer cobro:</span>
                    <span className="font-medium">
                      {billing?.first_billing_date 
                        ? format(new Date(billing.first_billing_date), 'dd MMM yyyy', { locale: es })
                        : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Equipo instalado resumen */}
            {equipment && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    Equipo Instalado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-primary">Antena</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">Marca/Modelo:</span>
                        <span className="font-medium">{equipment.antenna_brand} {equipment.antenna_model}</span>
                        <span className="text-muted-foreground">IP:</span>
                        <span className="font-mono">{equipment.antenna_ip || '-'}</span>
                        <span className="text-muted-foreground">MAC:</span>
                        <span className="font-mono text-xs">{equipment.antenna_mac || '-'}</span>
                        <span className="text-muted-foreground">SSID:</span>
                        <span>{equipment.antenna_ssid || '-'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-primary">Router</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground">Marca/Modelo:</span>
                        <span className="font-medium">{equipment.router_brand} {equipment.router_model}</span>
                        <span className="text-muted-foreground">Red WiFi:</span>
                        <span className="font-medium">{equipment.router_network_name || '-'}</span>
                        <span className="text-muted-foreground">Contraseña:</span>
                        <span className="font-mono bg-muted px-1 rounded">{equipment.router_password || '-'}</span>
                        <span className="text-muted-foreground">IP:</span>
                        <span className="font-mono">{equipment.router_ip || '-'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB EQUIPO */}
          <TabsContent value="equipo" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wifi className="h-5 w-5 text-blue-600" />
                    Antena
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipment ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Marca</p>
                          <p className="font-medium text-lg">{equipment.antenna_brand || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Modelo</p>
                          <p className="font-medium text-lg">{equipment.antenna_model || '-'}</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Dirección MAC</p>
                          <p className="font-mono bg-muted px-2 py-1 rounded text-sm">{equipment.antenna_mac || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dirección IP</p>
                          <p className="font-mono bg-muted px-2 py-1 rounded text-sm">{equipment.antenna_ip || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">SSID</p>
                          <p className="font-medium">{equipment.antenna_ssid || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Número de Serie</p>
                          <p className="font-mono text-sm">{equipment.antenna_serial || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Sin información de antena</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wifi className="h-5 w-5 text-green-600" />
                    Router
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {equipment ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Marca</p>
                          <p className="font-medium text-lg">{equipment.router_brand || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Modelo</p>
                          <p className="font-medium text-lg">{equipment.router_model || '-'}</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Dirección MAC</p>
                          <p className="font-mono bg-muted px-2 py-1 rounded text-sm">{equipment.router_mac || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dirección IP</p>
                          <p className="font-mono bg-muted px-2 py-1 rounded text-sm">{equipment.router_ip || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Número de Serie</p>
                        <p className="font-mono text-sm">{equipment.router_serial || '-'}</p>
                      </div>
                      <Separator />
                      <div className="bg-primary/5 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Red WiFi</p>
                        <p className="font-bold text-lg">{equipment.router_network_name || '-'}</p>
                        <p className="text-sm text-muted-foreground mt-2 mb-1">Contraseña</p>
                        <p className="font-mono bg-white px-3 py-2 rounded border text-lg">{equipment.router_password || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Sin información de router</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {equipment && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Información de Instalación</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Instalación</p>
                      <p className="font-medium">
                        {equipment.installation_date
                          ? format(new Date(equipment.installation_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Instalador</p>
                      <p className="font-medium">{equipment.installer_name || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB PAGOS */}
          <TabsContent value="pagos" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-green-600 mb-1">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Número de Pagos</p>
                  <p className="text-2xl font-bold">{payments.length}</p>
                </CardContent>
              </Card>
              <Card className={(billing?.balance || 0) > 0 ? 'bg-red-50 border-red-200' : ''}>
                <CardContent className="pt-4">
                  <p className={`text-sm mb-1 ${(billing?.balance || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    Saldo Pendiente
                  </p>
                  <p className={`text-2xl font-bold ${(billing?.balance || 0) > 0 ? 'text-red-700' : ''}`}>
                    {formatCurrency(billing?.balance || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Receipt className="h-5 w-5" />
                  Historial de Pagos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-green-600">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">{payment.payment_type}</Badge>
                          {payment.period_month && payment.period_year && (
                            <p className="text-sm text-muted-foreground">
                              Periodo: {payment.period_month}/{payment.period_year}
                            </p>
                          )}
                          {payment.receipt_number && (
                            <p className="text-xs text-muted-foreground">
                              Recibo: {payment.receipt_number}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-12">
                    No hay pagos registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB INFO PERSONAL */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre Completo</p>
                  <p className="font-medium text-lg">
                    {client.first_name} {client.last_name_paterno} {client.last_name_materno || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Alta</p>
                  <p className="font-medium">
                    {format(new Date(client.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5" />
                  Teléfonos de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono Principal</p>
                    <p className="font-medium text-lg">{client.phone1}</p>
                  </div>
                  {client.phone2 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono 2</p>
                      <p className="font-medium text-lg">{client.phone2}</p>
                    </div>
                  )}
                  {client.phone3 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono 3</p>
                      <p className="font-medium text-lg">{client.phone3}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Dirección de Instalación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Dirección Completa</p>
                    <p className="font-medium text-lg">
                      {client.street} {client.exterior_number}
                      {client.interior_number && ` Int. ${client.interior_number}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Colonia</p>
                    <p className="font-medium">{client.neighborhood}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ciudad</p>
                    <p className="font-medium">{client.city}</p>
                  </div>
                  {client.postal_code && (
                    <div>
                      <p className="text-sm text-muted-foreground">Código Postal</p>
                      <p className="font-medium">{client.postal_code}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB DOCUMENTOS */}
          <TabsContent value="documentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Documentos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold">INE Suscriptor</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={client.ine_subscriber_front ? 'default' : 'outline'}
                        size="sm"
                        disabled={!client.ine_subscriber_front}
                        onClick={() => handleDownloadDocument(client.ine_subscriber_front)}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Frente
                      </Button>
                      <Button
                        variant={client.ine_subscriber_back ? 'default' : 'outline'}
                        size="sm"
                        disabled={!client.ine_subscriber_back}
                        onClick={() => handleDownloadDocument(client.ine_subscriber_back)}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Reverso
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">INE Adicional</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={client.ine_other_front ? 'default' : 'outline'}
                        size="sm"
                        disabled={!client.ine_other_front}
                        onClick={() => handleDownloadDocument(client.ine_other_front)}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Frente
                      </Button>
                      <Button
                        variant={client.ine_other_back ? 'default' : 'outline'}
                        size="sm"
                        disabled={!client.ine_other_back}
                        onClick={() => handleDownloadDocument(client.ine_other_back)}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Reverso
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 col-span-2">
                    <h4 className="font-semibold">Contrato Firmado</h4>
                    <div className="flex gap-2">
                      <Button
                        variant={client.contract_page1 ? 'default' : 'outline'}
                        size="sm"
                        disabled={!client.contract_page1}
                        onClick={() => handleDownloadDocument(client.contract_page1)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Página 1
                      </Button>
                      <Button
                        variant={client.contract_page2 ? 'default' : 'outline'}
                        size="sm"
                        disabled={!client.contract_page2}
                        onClick={() => handleDownloadDocument(client.contract_page2)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Página 2
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
