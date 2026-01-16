import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/shared/SearchInput';
import { DataTable } from '@/components/shared/DataTable';
import { ClientDetailDialog } from '@/components/clients/ClientDetailDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { CancelClientDialog } from '@/components/clients/CancelClientDialog';
import { PaymentFormDialog } from '@/components/payments/PaymentFormDialog';
import { exportToExcel } from '@/lib/exportToExcel';
import { formatCurrency } from '@/lib/billing';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Download, Eye, Edit, CreditCard, XCircle, Users, Wifi, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { format, addMonths, setDate, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Client, ClientBilling, Equipment } from '@/types/database';

type ClientWithDetails = Client & {
  client_billing: (ClientBilling & {
    billing_day?: number;
    prorated_amount?: number;
    additional_charges?: number;
  }) | null;
  equipment: (Equipment & { antenna_serial?: string })[];
};

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

// Función para determinar si está próximo a vencer (7 días)
function isNearDue(billingDay: number): boolean {
  const nextBilling = getNextBillingDate(billingDay);
  const today = startOfDay(new Date());
  const diffDays = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

export default function Clients() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithDetails | null>(null);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          client_billing (*),
          equipment (*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientWithDetails[];
    },
  });

  // Estadísticas
  const totalClients = clients.length;
  const totalMonthlyRevenue = clients.reduce((sum, c) => sum + (c.client_billing?.monthly_fee || 0), 0);
  const totalDebt = clients.reduce((sum, c) => sum + (c.client_billing?.balance || 0), 0);
  const clientsWithDebt = clients.filter(c => (c.client_billing?.balance || 0) > 0).length;

  const filteredClients = clients.filter((client) => {
    const searchLower = search.toLowerCase();
    const equipment = client.equipment?.[0];
    return (
      client.first_name.toLowerCase().includes(searchLower) ||
      client.last_name_paterno.toLowerCase().includes(searchLower) ||
      (client.last_name_materno?.toLowerCase().includes(searchLower) ?? false) ||
      client.phone1.includes(search) ||
      client.neighborhood.toLowerCase().includes(searchLower) ||
      client.city.toLowerCase().includes(searchLower) ||
      (equipment?.antenna_brand?.toLowerCase().includes(searchLower) ?? false) ||
      (equipment?.antenna_model?.toLowerCase().includes(searchLower) ?? false) ||
      (equipment?.router_network_name?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleExport = () => {
    const exportData = filteredClients.map((client) => {
      const billing = client.client_billing;
      const equipment = client.equipment?.[0];
      const billingDay = (billing as any)?.billing_day || 10;
      const nextBilling = getNextBillingDate(billingDay);
      
      return {
        'Nombre': `${client.first_name} ${client.last_name_paterno} ${client.last_name_materno || ''}`.trim(),
        'Teléfono 1': client.phone1,
        'Teléfono 2': client.phone2 || '',
        'Dirección': `${client.street} ${client.exterior_number}${client.interior_number ? ' Int. ' + client.interior_number : ''}, ${client.neighborhood}, ${client.city}`,
        'Mensualidad': billing?.monthly_fee || 0,
        'Día de Corte': billingDay,
        'Próximo Cobro': format(nextBilling, 'dd/MM/yyyy'),
        'Saldo': billing?.balance || 0,
        'Antena': `${equipment?.antenna_brand || ''} ${equipment?.antenna_model || ''}`.trim() || 'N/A',
        'IP Antena': equipment?.antenna_ip || '',
        'Router': `${equipment?.router_brand || ''} ${equipment?.router_model || ''}`.trim() || 'N/A',
        'Red WiFi': equipment?.router_network_name || '',
      };
    });
    exportToExcel(exportData, 'clientes-activos');
  };

  const handleView = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setShowDetailDialog(true);
  };

  const handleEdit = (client: ClientWithDetails) => {
    setEditingClient(client);
    setShowFormDialog(true);
  };

  const handleCancel = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setShowCancelDialog(true);
  };

  const handlePayment = (client: ClientWithDetails) => {
    setSelectedClient(client);
    setShowPaymentDialog(true);
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setShowFormDialog(true);
  };

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      render: (client: ClientWithDetails) => (
        <div>
          <p className="font-medium">
            {client.first_name} {client.last_name_paterno} {client.last_name_materno || ''}
          </p>
          <p className="text-sm text-muted-foreground">{client.phone1}</p>
        </div>
      ),
    },
    {
      key: 'equipment',
      header: 'Equipo Instalado',
      render: (client: ClientWithDetails) => {
        const equipment = client.equipment?.[0];
        if (!equipment) return <span className="text-muted-foreground">Sin equipo</span>;
        
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-primary" />
              <span className="font-medium">{equipment.antenna_brand} {equipment.antenna_model}</span>
            </div>
            {equipment.antenna_ip && (
              <p className="text-muted-foreground font-mono text-xs">{equipment.antenna_ip}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'monthly_fee',
      header: 'Mensualidad',
      render: (client: ClientWithDetails) => (
        <span className="font-semibold text-primary">
          {formatCurrency(client.client_billing?.monthly_fee || 0)}
        </span>
      ),
    },
    {
      key: 'next_billing',
      header: 'Próximo Cobro',
      render: (client: ClientWithDetails) => {
        const billingDay = (client.client_billing as any)?.billing_day || 10;
        const nextBilling = getNextBillingDate(billingDay);
        const nearDue = isNearDue(billingDay);
        
        return (
          <div className="flex items-center gap-2">
            <Calendar className={`h-4 w-4 ${nearDue ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <div>
              <p className={`text-sm font-medium ${nearDue ? 'text-amber-600' : ''}`}>
                {format(nextBilling, 'dd MMM', { locale: es })}
              </p>
              <p className="text-xs text-muted-foreground">Día {billingDay}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'balance',
      header: 'Saldo',
      render: (client: ClientWithDetails) => {
        const balance = client.client_billing?.balance || 0;
        return (
          <Badge 
            variant={balance > 0 ? 'destructive' : 'secondary'}
            className={balance > 0 ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-green-100 text-green-700 hover:bg-green-100'}
          >
            {formatCurrency(balance)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (client: ClientWithDetails) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleView(client)} title="Ver detalles">
            <Eye className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(client)} title="Editar">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handlePayment(client)} title="Registrar pago">
                <CreditCard className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleCancel(client)} title="Cancelar servicio">
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes Activos</h1>
            <p className="text-muted-foreground">Gestión completa de clientes con servicio activo</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            {isAdmin && (
              <Button onClick={handleNewClient}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Cliente
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground">clientes activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalMonthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">suma de mensualidades</p>
            </CardContent>
          </Card>

          <Card className={totalDebt > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adeudo Total</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${totalDebt > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalDebt > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(totalDebt)}
              </div>
              <p className="text-xs text-muted-foreground">saldo pendiente total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Adeudo</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsWithDebt}</div>
              <p className="text-xs text-muted-foreground">clientes con saldo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Clientes ({filteredClients.length})
              </CardTitle>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nombre, teléfono, colonia, antena, red WiFi..."
              />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredClients}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No hay clientes activos"
            />
          </CardContent>
        </Card>
      </div>

      <ClientDetailDialog
        client={selectedClient}
        open={showDetailDialog}
        onOpenChange={(open) => {
          setShowDetailDialog(open);
          if (!open) {
            refetch(); // Refresh data when dialog closes
          }
        }}
        onRegisterPayment={() => {
          setShowDetailDialog(false);
          setShowPaymentDialog(true);
        }}
        onEdit={() => {
          setShowDetailDialog(false);
          setEditingClient(selectedClient);
          setShowFormDialog(true);
        }}
      />

      <ClientFormDialog
        client={editingClient}
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSuccess={() => {
          refetch();
          setShowFormDialog(false);
        }}
      />

      <CancelClientDialog
        client={selectedClient}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onSuccess={() => {
          refetch();
          setShowCancelDialog(false);
        }}
      />

      <PaymentFormDialog
        client={selectedClient}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={() => {
          refetch();
          setShowPaymentDialog(false);
        }}
      />
    </AppLayout>
  );
}
