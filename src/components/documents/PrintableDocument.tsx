import { useRef, ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';

interface PrintableDocumentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onDownloadPDF?: () => void;
}

export function PrintableDocument({
  open,
  onOpenChange,
  title,
  children,
  onDownloadPDF,
}: PrintableDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-gray-100 p-4 rounded-lg">
          <div ref={printRef} className="shadow-lg">
            {children}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          {onDownloadPDF && (
            <Button variant="outline" onClick={onDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          )}
          <Button onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
