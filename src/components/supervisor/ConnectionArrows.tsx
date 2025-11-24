import { useEffect, useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";

interface ConnectionArrowsProps {
  selectedMarca: string | null;
  selectedVendedor: { id: string } | null;
  selectedCliente: { id: string } | null;
}

interface ArrowPosition {
  top: number;
  left: number;
  width: number;
}

export function ConnectionArrows({ selectedMarca, selectedVendedor, selectedCliente }: ConnectionArrowsProps) {
  const [marcaToVendedor, setMarcaToVendedor] = useState<ArrowPosition | null>(null);
  const [vendedorToCliente, setVendedorToCliente] = useState<ArrowPosition | null>(null);

  const calculatePositions = useCallback(() => {
    // Seta Marca → Vendedor (apenas se ambos selecionados)
    if (selectedMarca && selectedVendedor) {
      const marcaElement = document.querySelector(`[data-marca="${selectedMarca}"]`);
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);

      if (marcaElement && vendedorElement) {
        const marcaRect = marcaElement.getBoundingClientRect();
        const vendedorRect = vendedorElement.getBoundingClientRect();

        const top = marcaRect.top + marcaRect.height / 2 - 12;
        const left = marcaRect.right;
        const width = vendedorRect.left - marcaRect.right;

        if (width > 0) {
          setMarcaToVendedor({ top, left, width });
        }
      }
    } else {
      setMarcaToVendedor(null);
    }

    // Seta Vendedor → Cliente (apenas se ambos selecionados)
    if (selectedVendedor && selectedCliente) {
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);
      const clienteElement = document.querySelector(`[data-cliente-id="${selectedCliente.id}"]`);

      if (vendedorElement && clienteElement) {
        const vendedorRect = vendedorElement.getBoundingClientRect();
        const clienteRect = clienteElement.getBoundingClientRect();

        const top = vendedorRect.top + vendedorRect.height / 2 - 12;
        const left = vendedorRect.right;
        const width = clienteRect.left - vendedorRect.right;

        if (width > 0) {
          setVendedorToCliente({ top, left, width });
        }
      }
    } else {
      setVendedorToCliente(null);
    }
  }, [selectedMarca, selectedVendedor, selectedCliente]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePositions();
    }, 300);

    const handleUpdate = () => {
      calculatePositions();
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [calculatePositions]);

  if (!marcaToVendedor && !vendedorToCliente) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Seta Marca → Vendedor */}
      {marcaToVendedor && (
        <div
          className="absolute flex items-center animate-fade-in"
          style={{
            top: `${marcaToVendedor.top}px`,
            left: `${marcaToVendedor.left}px`,
            width: `${marcaToVendedor.width}px`,
          }}
        >
          <div className="flex-1 h-0.5 bg-gradient-to-r from-primary via-primary to-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground to-transparent animate-shimmer" />
          </div>
          <ArrowRight className="h-6 w-6 text-primary animate-pulse -ml-1" />
        </div>
      )}

      {/* Seta Vendedor → Cliente */}
      {vendedorToCliente && (
        <div
          className="absolute flex items-center animate-fade-in"
          style={{
            top: `${vendedorToCliente.top}px`,
            left: `${vendedorToCliente.left}px`,
            width: `${vendedorToCliente.width}px`,
          }}
        >
          <div className="flex-1 h-0.5 bg-gradient-to-r from-primary via-primary to-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground to-transparent animate-shimmer" />
          </div>
          <ArrowRight className="h-6 w-6 text-primary animate-pulse -ml-1" />
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
