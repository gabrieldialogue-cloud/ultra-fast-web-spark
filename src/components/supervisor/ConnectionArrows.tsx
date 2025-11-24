import { useEffect, useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";

interface ConnectionArrowsProps {
  selectedMarca: string | null;
  selectedVendedor: { id: string } | null;
  selectedCliente: { id: string } | null;
}

interface CurvedArrowData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ConnectionArrows({ selectedMarca, selectedVendedor, selectedCliente }: ConnectionArrowsProps) {
  const [marcaToVendedor, setMarcaToVendedor] = useState<CurvedArrowData | null>(null);
  const [vendedorToCliente, setVendedorToCliente] = useState<CurvedArrowData | null>(null);

  const calculatePositions = useCallback(() => {
    // Seta Marca → Vendedor (apenas se ambos selecionados)
    if (selectedMarca && selectedVendedor) {
      const marcaElement = document.querySelector(`[data-marca="${selectedMarca}"]`);
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);

      if (marcaElement && vendedorElement) {
        const marcaRect = marcaElement.getBoundingClientRect();
        const vendedorRect = vendedorElement.getBoundingClientRect();

        const startX = marcaRect.right;
        const startY = marcaRect.top + marcaRect.height / 2;
        const endX = vendedorRect.left;
        const endY = vendedorRect.top + vendedorRect.height / 2;

        if (endX > startX) {
          setMarcaToVendedor({ startX, startY, endX, endY });
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

        const startX = vendedorRect.right;
        const startY = vendedorRect.top + vendedorRect.height / 2;
        const endX = clienteRect.left;
        const endY = clienteRect.top + clienteRect.height / 2;

        if (endX > startX) {
          setVendedorToCliente({ startX, startY, endX, endY });
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

  const renderCurvedArrow = (data: CurvedArrowData, key: string) => {
    const width = data.endX - data.startX;
    const height = data.endY - data.startY;
    const distance = Math.sqrt(width * width + height * height);
    
    // Calcular o ponto de controle para a curva (no meio, deslocado)
    const midX = (data.startX + data.endX) / 2;
    const midY = (data.startY + data.endY) / 2;
    
    // Criar o caminho da curva usando divs
    const curveIntensity = Math.abs(height) * 0.5;

    return (
      <div key={key} className="absolute inset-0 pointer-events-none">
        {/* Linha horizontal do início */}
        <div
          className="absolute h-0.5 bg-gradient-to-r from-primary to-primary/80 animate-fade-in"
          style={{
            left: `${data.startX}px`,
            top: `${data.startY}px`,
            width: `${width * 0.3}px`,
            transformOrigin: 'left center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/50 to-transparent animate-shimmer" />
        </div>

        {/* Curva central */}
        <div
          className="absolute animate-fade-in"
          style={{
            left: `${data.startX + width * 0.3}px`,
            top: `${Math.min(data.startY, data.endY)}px`,
            width: `${width * 0.4}px`,
            height: `${Math.abs(height) + 20}px`,
          }}
        >
          <div
            className="absolute w-full h-full border-r-2 border-t-2 border-primary rounded-tr-[100px]"
            style={{
              transform: height > 0 ? 'scaleY(1)' : 'scaleY(-1)',
              borderTopRightRadius: `${Math.abs(height) + 20}px ${Math.abs(height) + 20}px`,
            }}
          />
        </div>

        {/* Linha horizontal do fim */}
        <div
          className="absolute h-0.5 bg-gradient-to-r from-primary/80 to-primary animate-fade-in"
          style={{
            left: `${data.endX - width * 0.3}px`,
            top: `${data.endY}px`,
            width: `${width * 0.3}px`,
            transformOrigin: 'right center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/50 to-transparent animate-shimmer" />
        </div>

        {/* Ícone da seta no final */}
        <div
          className="absolute animate-pulse"
          style={{
            left: `${data.endX - 8}px`,
            top: `${data.endY - 12}px`,
          }}
        >
          <ArrowRight className="h-6 w-6 text-primary drop-shadow-lg" />
        </div>

        {/* Ponto de início brilhante */}
        <div
          className="absolute w-3 h-3 bg-primary rounded-full animate-pulse"
          style={{
            left: `${data.startX - 6}px`,
            top: `${data.startY - 6}px`,
            boxShadow: '0 0 10px hsl(var(--primary))',
          }}
        />
      </div>
    );
  };

  if (!marcaToVendedor && !vendedorToCliente) return null;

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-10">
        {marcaToVendedor && renderCurvedArrow(marcaToVendedor, 'marca-vendedor')}
        {vendedorToCliente && renderCurvedArrow(vendedorToCliente, 'vendedor-cliente')}
      </div>

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
    </>
  );
}
