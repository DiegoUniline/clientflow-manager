import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/billing';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Clock, ArrowRight, Wallet, Calendar, AlertCircle } from 'lucide-react';

interface PaymentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  paymentAmount: number;
  creditAmountToUse: number;
  pendingCharges: Array<{ id: string; description: string; amount: number; created_at: string }>;
  monthlyFee: number;
  isSubmitting: boolean;
}

export function PaymentPreviewDialog({
  open,
  onOpenChange,
  onConfirm,
  paymentAmount,
  creditAmountToUse,
  pendingCharges,
  monthlyFee,
  isSubmitting,
}: PaymentPreviewDialogProps) {
  const totalPayment = paymentAmount + creditAmountToUse;

  const preview = useMemo(() => {
    let remaining = totalPayment;
    const coveredCharges: typeof pendingCharges = [];
    const partialCharge: { charge: typeof pendingCharges[0]; amountApplied: number; remaining: number } | null = null;
    let advanceMonths = 0;
    let excessCredit = 0;

    // Sort charges by created_at (oldest first)
    const sortedCharges = [...pendingCharges].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Apply payment to charges
    for (const charge of sortedCharges) {
      if (remaining <= 0) break;

      if (remaining >= charge.amount) {
        coveredCharges.push(charge);
        remaining -= charge.amount;
      } else {
        // Partial payment - applies to oldest charge
        break;
      }
    }

    // Calculate advance months if there's excess after covering all charges
    const totalPendingAmount = pendingCharges.reduce((sum, c) => sum + c.amount, 0);
    const excessAfterDebts = totalPayment - totalPendingAmount;

    if (excessAfterDebts > 0 && monthlyFee > 0) {
      advanceMonths = Math.floor(excessAfterDebts / monthlyFee);
      excessCredit = excessAfterDebts % monthlyFee;
    } else if (remaining > 0 && pendingCharges.length === 0) {
      // No pending charges, all goes to advance
      if (monthlyFee > 0) {
        advanceMonths = Math.floor(totalPayment / monthlyFee);
        excessCredit = totalPayment % monthlyFee;
      } else {
        excessCredit = totalPayment;
      }
    }

    const newBalance = excessCredit > 0 ? -excessCredit : 0;

    return {
      coveredCharges,
      partialCharge,
      advanceMonths,
      excessCredit,
      newBalance,
      totalPendingAmount,
      totalPayment,
    };
  }, [totalPayment, pendingCharges, monthlyFee]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Resumen del Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment breakdown */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monto en efectivo/transferencia:</span>
              <span className="font-medium">{formatCurrency(paymentAmount)}</span>
            </div>
            {creditAmountToUse > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span className="text-sm flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  Saldo a favor aplicado:
                </span>
                <span className="font-medium">{formatCurrency(creditAmountToUse)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total a aplicar:</span>
              <span className="text-primary">{formatCurrency(preview.totalPayment)}</span>
            </div>
          </div>

          {/* Charges that will be covered */}
          {preview.coveredCharges.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Cargos que quedarán pagados ({preview.coveredCharges.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {preview.coveredCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex justify-between items-center text-sm bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded"
                  >
                    <span>{charge.description}</span>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                      {formatCurrency(charge.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining pending charges */}
          {preview.totalPendingAmount > preview.totalPayment && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
                <Clock className="h-4 w-4" />
                Cargos que quedan pendientes
              </h4>
              <div className="text-sm text-muted-foreground">
                Quedará un saldo pendiente de{' '}
                <span className="font-bold text-amber-600">
                  {formatCurrency(preview.totalPendingAmount - preview.totalPayment)}
                </span>
              </div>
            </div>
          )}

          {/* Advance months */}
          {preview.advanceMonths > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
                Mensualidades adelantadas
              </h4>
              <p className="text-sm mt-1">
                Se crearán <span className="font-bold">{preview.advanceMonths}</span> mensualidad(es) adelantada(s)
              </p>
            </div>
          )}

          {/* Resulting balance */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Saldo resultante:</span>
              {preview.newBalance < 0 ? (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Saldo a favor: {formatCurrency(Math.abs(preview.newBalance))}
                </Badge>
              ) : preview.totalPendingAmount > preview.totalPayment ? (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Pendiente: {formatCurrency(preview.totalPendingAmount - preview.totalPayment)}
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cuenta al corriente
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
