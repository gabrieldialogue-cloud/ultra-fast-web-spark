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
    
    // Ajustar a intensidade da curva baseado na distância vertical
    const curveRadius = Math.max(Math.abs(height) * 1.5, 60);
    
    // Criar path SVG para curva suave
    const startControlX = data.startX + width * 0.25;
    const startControlY = data.startY;
    const endControlX = data.endX - width * 0.25;
    const endControlY = data.endY;
    
    const svgPath = `M ${data.startX} ${data.startY} C ${startControlX} ${startControlY}, ${endControlX} ${endControlY}, ${data.endX} ${data.endY}`;

    return (
      <svg
        key={key}
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100vw', height: '100vh', zIndex: 10 }}
      >
        <defs>
          {/* Gradiente para a linha */}
          <linearGradient id={`gradient-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 0.8 }} />
            <stop offset="50%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 1 }} />
            <stop offset="100%" className="text-primary" style={{ stopColor: 'currentColor', stopOpacity: 0.8 }} />
          </linearGradient>

          {/* Marker para a seta */}
          <marker
            id={`arrowhead-${key}`}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
          >
            <path
              d="M2,2 L2,10 L10,6 z"
              className="fill-primary"
            />
          </marker>
        </defs>

        {/* Glow de fundo */}
        <path
          d={svgPath}
          fill="none"
          className="stroke-primary/20"
          strokeWidth="8"
          strokeLinecap="round"
          style={{
            filter: 'blur(4px)',
          }}
        />

        {/* Linha principal com animação de desenho */}
        <path
          d={svgPath}
          fill="none"
          stroke={`url(#gradient-${key})`}
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd={`url(#arrowhead-${key})`}
          className="animate-draw-path"
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
            animation: 'drawPath 1.5s ease-out forwards',
          }}
        />

        {/* Partícula animada viajando pela linha */}
        <circle
          r="5"
          className="fill-primary animate-pulse"
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={svgPath}
            begin="1.5s"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            dur="2s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>

        {/* Ponto inicial brilhante */}
        <circle
          cx={data.startX}
          cy={data.startY}
          r="4"
          className="fill-primary animate-pulse"
          style={{
            filter: 'drop-shadow(0 0 6px hsl(var(--primary)))',
          }}
        />

        {/* Ponto final brilhante */}
        <circle
          cx={data.endX}
          cy={data.endY}
          r="4"
          className="fill-primary"
          style={{
            filter: 'drop-shadow(0 0 6px hsl(var(--primary)))',
            animation: 'fadeInScale 0.3s ease-out 1.5s forwards',
            opacity: 0,
          }}
        />
      </svg>
    );
  };

  if (!marcaToVendedor && !vendedorToCliente) return null;

  return (
    <>
      {marcaToVendedor && renderCurvedArrow(marcaToVendedor, 'marca-vendedor')}
      {vendedorToCliente && renderCurvedArrow(vendedorToCliente, 'vendedor-cliente')}

      <style>{`
        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
