import { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/billing';

interface PaymentReceiptDocumentProps {
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    payment_type: string;
    bank_type?: string | null;
    receipt_number?: string | null;
    notes?: string | null;
    created_at: string;
  };
  client: {
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
  paymentMethodName: string;
  bankName?: string;
  chargesCovered?: Array<{ description: string; amount: number }>;
  companyName?: string;
}

export const PaymentReceiptDocument = forwardRef<HTMLDivElement, PaymentReceiptDocumentProps>(
  ({ payment, client, paymentMethodName, bankName, chargesCovered = [], companyName = 'ISP Services' }, ref) => {
    const clientFullName = `${client.first_name} ${client.last_name_paterno} ${client.last_name_materno || ''}`.trim();
    const clientAddress = `${client.street} #${client.exterior_number}${client.interior_number ? ` Int. ${client.interior_number}` : ''}, ${client.neighborhood}, ${client.city}`;

    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-2xl mx-auto font-sans" style={{ minHeight: '500px' }}>
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
              <p className="text-sm text-gray-600">Servicios de Internet</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900">COMPROBANTE DE PAGO</h2>
              <p className="text-sm text-gray-600">
                Fecha: {format(new Date(payment.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
              {payment.receipt_number && (
                <p className="text-sm text-gray-600">Folio: {payment.receipt_number}</p>
              )}
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Datos del Cliente</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Nombre:</p>
              <p className="font-medium">{clientFullName}</p>
            </div>
            <div>
              <p className="text-gray-600">Teléfono:</p>
              <p className="font-medium">{client.phone1}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600">Dirección:</p>
              <p className="font-medium">{clientAddress}</p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Detalles del Pago</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 text-gray-600">Fecha de pago:</td>
                <td className="py-2 text-right font-medium">
                  {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-600">Método de pago:</td>
                <td className="py-2 text-right font-medium">{paymentMethodName}</td>
              </tr>
              {bankName && (
                <tr className="border-b">
                  <td className="py-2 text-gray-600">Banco:</td>
                  <td className="py-2 text-right font-medium">{bankName}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Charges Covered */}
        {chargesCovered.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Conceptos Cubiertos</h3>
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-3 text-left">Concepto</th>
                  <th className="py-2 px-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {chargesCovered.map((charge, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2 px-3">{charge.description}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(charge.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total */}
        <div className="bg-emerald-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">TOTAL PAGADO:</span>
            <span className="text-2xl font-bold text-emerald-700">{formatCurrency(payment.amount)}</span>
          </div>
        </div>

        {/* Notes */}
        {payment.notes && (
          <div className="mb-6 text-sm">
            <p className="text-gray-600">Notas:</p>
            <p className="font-medium">{payment.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          <p>Este comprobante es válido como constancia de pago.</p>
          <p>ID de transacción: {payment.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    );
  }
);

PaymentReceiptDocument.displayName = 'PaymentReceiptDocument';
