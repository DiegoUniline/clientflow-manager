import { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/billing';

interface Charge {
  id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  paid_date?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  notes?: string | null;
}

interface AccountStatementDocumentProps {
  client: {
    id: string;
    first_name: string;
    last_name_paterno: string;
    last_name_materno?: string | null;
    street: string;
    exterior_number: string;
    interior_number?: string | null;
    neighborhood: string;
    city: string;
    phone1: string;
  };
  billing: {
    monthly_fee: number;
    billing_day: number;
    balance: number;
    installation_date: string;
  };
  charges: Charge[];
  payments: Payment[];
  paymentMethods: Array<{ id: string; name: string }>;
  generatedAt?: Date;
  companyName?: string;
}

export const AccountStatementDocument = forwardRef<HTMLDivElement, AccountStatementDocumentProps>(
  ({ client, billing, charges, payments, paymentMethods, generatedAt = new Date(), companyName = 'ISP Services' }, ref) => {
    const clientFullName = `${client.first_name} ${client.last_name_paterno} ${client.last_name_materno || ''}`.trim();
    const clientAddress = `${client.street} #${client.exterior_number}${client.interior_number ? ` Int. ${client.interior_number}` : ''}, ${client.neighborhood}, ${client.city}`;

    const getPaymentMethodName = (id: string) => {
      return paymentMethods.find(pm => pm.id === id)?.name || id;
    };

    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
    const totalPaid = charges.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
    const totalPending = charges.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    // Sort charges by date
    const sortedCharges = [...charges].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-4xl mx-auto font-sans text-sm" style={{ minHeight: '800px' }}>
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
              <p className="text-sm text-gray-600">Servicios de Internet</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900">ESTADO DE CUENTA</h2>
              <p className="text-sm text-gray-600">
                Generado: {format(generatedAt, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              </p>
              <p className="text-xs text-gray-500">ID Cliente: #{client.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">Datos del Cliente</h3>
            <p className="font-medium">{clientFullName}</p>
            <p className="text-gray-600">{clientAddress}</p>
            <p className="text-gray-600">Tel: {client.phone1}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">Información del Servicio</h3>
            <div className="space-y-1">
              <p><span className="text-gray-600">Tarifa mensual:</span> <span className="font-medium">{formatCurrency(billing.monthly_fee)}</span></p>
              <p><span className="text-gray-600">Día de corte:</span> <span className="font-medium">{billing.billing_day}</span></p>
              <p><span className="text-gray-600">Cliente desde:</span> <span className="font-medium">{format(new Date(billing.installation_date), 'dd/MM/yyyy')}</span></p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Total Cargos</p>
            <p className="text-lg font-bold">{formatCurrency(totalCharges)}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Total Pagado</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-600 uppercase">Pendiente</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totalPending)}</p>
          </div>
          <div className={`p-3 rounded-lg text-center ${billing.balance < 0 ? 'bg-emerald-100' : billing.balance > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <p className="text-xs text-gray-600 uppercase">Saldo Actual</p>
            <p className={`text-lg font-bold ${billing.balance < 0 ? 'text-emerald-700' : billing.balance > 0 ? 'text-red-700' : ''}`}>
              {billing.balance < 0 ? `(${formatCurrency(Math.abs(billing.balance))})` : formatCurrency(billing.balance)}
            </p>
            {billing.balance < 0 && <p className="text-xs text-emerald-600">A favor</p>}
          </div>
        </div>

        {/* Charges Table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Historial de Cargos</h3>
          <table className="w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-2 text-left border-r">Fecha</th>
                <th className="py-2 px-2 text-left border-r">Descripción</th>
                <th className="py-2 px-2 text-right border-r">Monto</th>
                <th className="py-2 px-2 text-center border-r">Estatus</th>
                <th className="py-2 px-2 text-center">Fecha Pago</th>
              </tr>
            </thead>
            <tbody>
              {sortedCharges.slice(0, 50).map((charge) => (
                <tr key={charge.id} className="border-t">
                  <td className="py-1 px-2 border-r">{format(new Date(charge.created_at), 'dd/MM/yy')}</td>
                  <td className="py-1 px-2 border-r">{charge.description}</td>
                  <td className="py-1 px-2 text-right border-r">{formatCurrency(charge.amount)}</td>
                  <td className="py-1 px-2 text-center border-r">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      charge.status === 'paid' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {charge.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="py-1 px-2 text-center">
                    {charge.paid_date ? format(new Date(charge.paid_date), 'dd/MM/yy') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {charges.length > 50 && (
            <p className="text-xs text-gray-500 mt-1">Mostrando 50 de {charges.length} cargos</p>
          )}
        </div>

        {/* Payments Table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Historial de Pagos</h3>
          <table className="w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-2 text-left border-r">Fecha</th>
                <th className="py-2 px-2 text-right border-r">Monto</th>
                <th className="py-2 px-2 text-left border-r">Método</th>
                <th className="py-2 px-2 text-left">Notas</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 30).map((payment) => (
                <tr key={payment.id} className="border-t">
                  <td className="py-1 px-2 border-r">{format(new Date(payment.payment_date), 'dd/MM/yy')}</td>
                  <td className="py-1 px-2 text-right font-medium text-emerald-700 border-r">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-1 px-2 border-r">{getPaymentMethodName(payment.payment_type)}</td>
                  <td className="py-1 px-2 truncate max-w-[150px]">{payment.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr className="border-t-2">
                <td className="py-2 px-2 border-r">Total:</td>
                <td className="py-2 px-2 text-right text-emerald-700 border-r">{formatCurrency(totalPayments)}</td>
                <td className="py-2 px-2" colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
          {payments.length > 30 && (
            <p className="text-xs text-gray-500 mt-1">Mostrando 30 de {payments.length} pagos</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          <p>Este documento es un resumen del estado de cuenta del cliente.</p>
          <p>Para cualquier aclaración, contacte a nuestras oficinas.</p>
        </div>
      </div>
    );
  }
);

AccountStatementDocument.displayName = 'AccountStatementDocument';
