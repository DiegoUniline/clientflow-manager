import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { calculateProration, calculateInitialBalance } from '@/lib/billing';

interface ImportClientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedClient {
  rowNumber: number;
  data: {
    first_name: string;
    last_name_paterno: string;
    last_name_materno?: string;
    phone1: string;
    phone2?: string;
    phone3?: string;
    street: string;
    exterior_number: string;
    interior_number?: string;
    neighborhood: string;
    city: string;
    postal_code?: string;
    monthly_fee: number;
    installation_cost: number;
    installation_date: string;
    billing_day: number;
    additional_charges: number;
    additional_charges_notes?: string;
    router_brand?: string;
    router_model?: string;
    router_mac?: string;
    router_ip?: string;
    router_serial?: string;
    router_network_name?: string;
    router_password?: string;
    antenna_brand?: string;
    antenna_model?: string;
    antenna_mac?: string;
    antenna_ip?: string;
    antenna_ssid?: string;
    antenna_serial?: string;
    installer_name?: string;
  };
  errors: string[];
  isValid: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

// CSV template columns
const CSV_COLUMNS = [
  'nombre',
  'apellido_paterno',
  'apellido_materno',
  'telefono1',
  'telefono2',
  'telefono3',
  'calle',
  'numero_exterior',
  'numero_interior',
  'colonia',
  'ciudad',
  'codigo_postal',
  'mensualidad',
  'costo_instalacion',
  'fecha_instalacion',
  'dia_corte',
  'cargos_adicionales',
  'notas_cargos',
  'router_marca',
  'router_modelo',
  'router_mac',
  'router_ip',
  'router_serial',
  'router_red',
  'router_password',
  'antena_marca',
  'antena_modelo',
  'antena_mac',
  'antena_ip',
  'antena_ssid',
  'antena_serial',
  'instalador',
];

const REQUIRED_COLUMNS = [
  'nombre',
  'apellido_paterno',
  'telefono1',
  'calle',
  'numero_exterior',
  'colonia',
  'ciudad',
  'mensualidad',
  'fecha_instalacion',
  'dia_corte',
];

export function ImportClientsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportClientsDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const validClients = parsedClients.filter((c) => c.isValid);
  const invalidClients = parsedClients.filter((c) => !c.isValid);

  const handleDownloadTemplate = () => {
    const headers = CSV_COLUMNS.join(',');
    const exampleRow = [
      'Juan',
      'Pérez',
      'García',
      '3331234567',
      '',
      '',
      'Av. Juárez',
      '123',
      'A',
      'Centro',
      'Guadalajara',
      '44100',
      '500',
      '800',
      '2025-01-25',
      '10',
      '0',
      '',
      'TP-Link',
      'Archer C6',
      '',
      '192.168.1.1',
      '',
      'MiRedWifi',
      'password123',
      'Ubiquiti',
      'LiteBeam 5AC',
      '',
      '192.168.1.20',
      'SSID_Torre',
      '',
      'Carlos López',
    ].join(',');

    const csvContent = `${headers}\n${exampleRow}`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importar_clientes.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Plantilla descargada');
  };

  const parseCSV = (content: string): string[][] => {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const validateRow = (row: string[], rowNumber: number): ParsedClient => {
    const errors: string[] = [];

    const getValue = (index: number): string => (row[index] || '').trim();
    const getNumber = (index: number, defaultValue = 0): number => {
      const val = parseFloat(getValue(index));
      return isNaN(val) ? defaultValue : val;
    };

    // Required field validation
    if (!getValue(0)) errors.push('Nombre es requerido');
    if (!getValue(1)) errors.push('Apellido paterno es requerido');
    if (!getValue(3) || getValue(3).length < 10) errors.push('Teléfono 1 inválido (mín. 10 dígitos)');
    if (!getValue(6)) errors.push('Calle es requerida');
    if (!getValue(7)) errors.push('Número exterior es requerido');
    if (!getValue(9)) errors.push('Colonia es requerida');
    if (!getValue(10)) errors.push('Ciudad es requerida');
    if (getNumber(12) <= 0) errors.push('Mensualidad debe ser mayor a 0');

    const installationDate = getValue(14);
    if (!installationDate || !/^\d{4}-\d{2}-\d{2}$/.test(installationDate)) {
      errors.push('Fecha de instalación inválida (usar formato AAAA-MM-DD)');
    }

    const billingDay = getNumber(15, 10);
    if (billingDay < 1 || billingDay > 28) {
      errors.push('Día de corte debe ser entre 1 y 28');
    }

    return {
      rowNumber,
      data: {
        first_name: getValue(0),
        last_name_paterno: getValue(1),
        last_name_materno: getValue(2) || undefined,
        phone1: getValue(3),
        phone2: getValue(4) || undefined,
        phone3: getValue(5) || undefined,
        street: getValue(6),
        exterior_number: getValue(7),
        interior_number: getValue(8) || undefined,
        neighborhood: getValue(9),
        city: getValue(10),
        postal_code: getValue(11) || undefined,
        monthly_fee: getNumber(12),
        installation_cost: getNumber(13),
        installation_date: getValue(14),
        billing_day: billingDay,
        additional_charges: getNumber(16),
        additional_charges_notes: getValue(17) || undefined,
        router_brand: getValue(18) || undefined,
        router_model: getValue(19) || undefined,
        router_mac: getValue(20) || undefined,
        router_ip: getValue(21) || undefined,
        router_serial: getValue(22) || undefined,
        router_network_name: getValue(23) || undefined,
        router_password: getValue(24) || undefined,
        antenna_brand: getValue(25) || undefined,
        antenna_model: getValue(26) || undefined,
        antenna_mac: getValue(27) || undefined,
        antenna_ip: getValue(28) || undefined,
        antenna_ssid: getValue(29) || undefined,
        antenna_serial: getValue(30) || undefined,
        installer_name: getValue(31) || undefined,
      },
      errors,
      isValid: errors.length === 0,
    };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      if (rows.length < 2) {
        toast.error('El archivo debe tener al menos una fila de datos además del encabezado');
        return;
      }

      // Skip header row and parse data
      const dataRows = rows.slice(1);
      const parsed = dataRows.map((row, index) => validateRow(row, index + 2));

      setParsedClients(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Error al leer el archivo CSV');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importClients = async () => {
    if (validClients.length === 0) {
      toast.error('No hay clientes válidos para importar');
      return;
    }

    setStep('importing');
    setProgress(0);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < validClients.length; i++) {
      const client = validClients[i];
      const { data } = client;

      try {
        // Calculate proration
        const proration = calculateProration(
          new Date(data.installation_date),
          data.billing_day,
          data.monthly_fee
        );

        const initialBalance = calculateInitialBalance(
          proration.proratedAmount,
          data.installation_cost,
          data.additional_charges
        );

        // 1. Insert client
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            first_name: data.first_name,
            last_name_paterno: data.last_name_paterno,
            last_name_materno: data.last_name_materno || null,
            phone1: data.phone1,
            phone1_country: 'MX',
            phone2: data.phone2 || null,
            phone2_country: 'MX',
            phone3: data.phone3 || null,
            phone3_country: 'MX',
            street: data.street,
            exterior_number: data.exterior_number,
            interior_number: data.interior_number || null,
            neighborhood: data.neighborhood,
            city: data.city,
            postal_code: data.postal_code || null,
            status: 'active',
          })
          .select('id')
          .single();

        if (clientError) throw clientError;

        const clientId = newClient.id;

        // 2. Insert billing
        const { error: billingError } = await supabase.from('client_billing').insert({
          client_id: clientId,
          monthly_fee: data.monthly_fee,
          installation_cost: data.installation_cost,
          installation_date: data.installation_date,
          first_billing_date: proration.firstBillingDate.toISOString().split('T')[0],
          billing_day: data.billing_day,
          prorated_amount: proration.proratedAmount,
          additional_charges: data.additional_charges,
          additional_charges_notes: data.additional_charges_notes || null,
          balance: initialBalance,
        });

        if (billingError) throw billingError;

        // 3. Insert charges
        const charges = [];

        if (data.installation_cost > 0) {
          charges.push({
            client_id: clientId,
            description: 'Costo de instalación',
            amount: data.installation_cost,
            status: 'pending',
            due_date: data.installation_date,
          });
        }

        if (proration.proratedAmount > 0) {
          charges.push({
            client_id: clientId,
            description: `Prorrateo (${proration.daysCharged} días)`,
            amount: proration.proratedAmount,
            status: 'pending',
            due_date: data.installation_date,
          });
        }

        if (data.additional_charges > 0) {
          charges.push({
            client_id: clientId,
            description: data.additional_charges_notes || 'Cargos adicionales',
            amount: data.additional_charges,
            status: 'pending',
            due_date: data.installation_date,
          });
        }

        if (charges.length > 0) {
          const { error: chargesError } = await supabase.from('client_charges').insert(charges);
          if (chargesError) throw chargesError;
        }

        // 4. Insert equipment
        const { error: equipmentError } = await supabase.from('equipment').insert({
          client_id: clientId,
          installation_date: data.installation_date,
          router_brand: data.router_brand || null,
          router_model: data.router_model || null,
          router_mac: data.router_mac || null,
          router_ip: data.router_ip || null,
          router_serial: data.router_serial || null,
          router_network_name: data.router_network_name || null,
          router_password: data.router_password || null,
          antenna_brand: data.antenna_brand || null,
          antenna_model: data.antenna_model || null,
          antenna_mac: data.antenna_mac || null,
          antenna_ip: data.antenna_ip || null,
          antenna_ssid: data.antenna_ssid || null,
          antenna_serial: data.antenna_serial || null,
          installer_name: data.installer_name || null,
        });

        if (equipmentError) throw equipmentError;

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: client.rowNumber,
          error: error.message || 'Error desconocido',
        });
      }

      setProgress(Math.round(((i + 1) / validClients.length) * 100));
    }

    setImportResult(result);
    setStep('complete');

    // Refresh clients list
    queryClient.invalidateQueries({ queryKey: ['clients'] });

    if (result.success > 0) {
      toast.success(`${result.success} cliente(s) importado(s) correctamente`);
      onSuccess?.();
    }
  };

  const handleClose = () => {
    setStep('upload');
    setParsedClients([]);
    setImportResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes
          </DialogTitle>
          <DialogDescription>
            Importa múltiples clientes desde un archivo CSV
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Descarga la plantilla y llena los datos de los clientes. Los campos obligatorios
                  son: nombre, apellido paterno, teléfono 1, calle, número exterior, colonia,
                  ciudad, mensualidad, fecha de instalación y día de corte.
                </AlertDescription>
              </Alert>

              <div className="flex justify-center">
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar Plantilla CSV
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Label htmlFor="csv-file" className="text-lg font-medium cursor-pointer">
                  Seleccionar archivo CSV
                </Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Arrastra o haz clic para seleccionar
                </p>
                <Input
                  id="csv-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Seleccionar Archivo'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 py-4">
              <div className="flex gap-4 justify-center">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  {validClients.length} válidos
                </Badge>
                {invalidClients.length > 0 && (
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    <XCircle className="h-4 w-4 mr-2" />
                    {invalidClients.length} con errores
                  </Badge>
                )}
              </div>

              {invalidClients.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Los siguientes registros tienen errores y no serán importados:
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-3">
                  {parsedClients.map((client) => (
                    <div
                      key={client.rowNumber}
                      className={`p-3 rounded-lg border ${
                        client.isValid
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                          : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm text-muted-foreground">Fila {client.rowNumber}:</span>
                          <p className="font-medium">
                            {client.data.first_name} {client.data.last_name_paterno}{' '}
                            {client.data.last_name_materno || ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {client.data.phone1} • {client.data.city}
                          </p>
                        </div>
                        {client.isValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      {client.errors.length > 0 && (
                        <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                          {client.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="mt-4 text-lg font-medium">Importando clientes...</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round((progress / 100) * validClients.length)} de {validClients.length}
                </p>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          )}

          {step === 'complete' && importResult && (
            <div className="py-4 space-y-4">
              <div className="text-center space-y-2">
                {importResult.success > 0 ? (
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 mx-auto text-red-500" />
                )}
                <h3 className="text-xl font-semibold">Importación Completada</h3>
              </div>

              <div className="flex gap-4 justify-center">
                <Badge variant="secondary" className="text-lg px-4 py-2 bg-green-100 text-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {importResult.success} importados
                </Badge>
                {importResult.failed > 0 && (
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    <XCircle className="h-4 w-4 mr-2" />
                    {importResult.failed} fallidos
                  </Badge>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                        <span className="font-medium">Fila {err.row}:</span> {err.error}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Volver
              </Button>
              <Button onClick={importClients} disabled={validClients.length === 0}>
                Importar {validClients.length} Cliente(s)
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
