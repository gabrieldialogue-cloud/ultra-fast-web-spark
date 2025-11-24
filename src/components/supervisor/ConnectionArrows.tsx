import { useEffect, useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";

interface ConnectionArrowsProps {
  selectedMarca: string | null;
  selectedVendedor: { id: string } | null;
  selectedCliente: { id: string } | null;
}

interface ArrowData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ConnectionArrows({ selectedMarca, selectedVendedor, selectedCliente }: ConnectionArrowsProps) {
  const [marcaToVendedor, setMarcaToVendedor] = useState<ArrowData | null>(null);
  const [vendedorToCliente, setVendedorToCliente] = useState<ArrowData | null>(null);

  const calculatePositions = useCallback(() => {
    // Seta Marca → Vendedor
    if (selectedMarca && selectedVendedor) {
      const marcaElement = document.querySelector(`[data-marca="${selectedMarca}"]`);
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);

      if (marcaElement && vendedorElement) {
        const marcaRect = marcaElement.getBoundingClientRect();
        const vendedorRect = vendedorElement.getBoundingClientRect();

        setMarcaToVendedor({
          startX: marcaRect.right,
          startY: marcaRect.top + marcaRect.height / 2,
          endX: vendedorRect.left,
          endY: vendedorRect.top + vendedorRect.height / 2,
        });
      }
    } else {
      setMarcaToVendedor(null);
    }

    // Seta Vendedor → Cliente
    if (selectedVendedor && selectedCliente) {
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);
      const clienteElement = document.querySelector(`[data-cliente-id="${selectedCliente.id}"]`);

      if (vendedorElement && clienteElement) {
        const vendedorRect = vendedorElement.getBoundingClientRect();
        const clienteRect = clienteElement.getBoundingClientRect();

        setVendedorToCliente({
          startX: vendedorRect.right,
          startY: vendedorRect.top + vendedorRect.height / 2,
          endX: clienteRect.left,
          endY: clienteRect.top + clienteRect.height / 2,
        });
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

  const renderStraightArrow = (data: ArrowData, key: string) => {
    return (
      <svg
        key={key}
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100vw', height: '100vh', zIndex: 10 }}
      >
        <defs>
          <marker
            id={`arrow-${key}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="5"
            orient="auto"
          >
            <path
              d="M0,0 L0,10 L10,5 z"
              className="fill-primary"
            />
          </marker>

          <linearGradient id={`grad-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          </linearGradient>
        </defs>

        {/* Linha de glow */}
        <line
          x1={data.startX}
          y1={data.startY}
          x2={data.endX}
          y2={data.endY}
          className="stroke-primary/20"
          strokeWidth="6"
          strokeLinecap="round"
          style={{ filter: 'blur(3px)' }}
        />

        {/* Linha principal com animação */}
        <line
          x1={data.startX}
          y1={data.startY}
          x2={data.endX}
          y2={data.endY}
          stroke={`url(#grad-${key})`}
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd={`url(#arrow-${key})`}
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: 1000,
            animation: 'drawLine 1s ease-out forwards',
          }}
        />

        {/* Partícula viajante */}
        <circle
          r="4"
          className="fill-primary"
          style={{
            animation: 'fadeParticle 2s linear infinite',
            animationDelay: '1s',
          }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            begin="1s"
          >
            <mpath href={`#path-${key}`} />
          </animateMotion>
        </circle>

        {/* Path invisível para a partícula seguir */}
        <path
          id={`path-${key}`}
          d={`M ${data.startX} ${data.startY} L ${data.endX} ${data.endY}`}
          fill="none"
          stroke="none"
        />

        {/* Ponto inicial */}
        <circle
          cx={data.startX}
          cy={data.startY}
          r="5"
          className="fill-primary"
          style={{
            filter: 'drop-shadow(0 0 8px hsl(var(--primary)))',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />

        {/* Ponto final */}
        <circle
          cx={data.endX}
          cy={data.endY}
          r="5"
          className="fill-primary"
          style={{
            filter: 'drop-shadow(0 0 8px hsl(var(--primary)))',
            opacity: 0,
            animation: 'fadeInPoint 0.3s ease-out 1s forwards',
          }}
        />
      </svg>
    );
  };

  if (!marcaToVendedor && !vendedorToCliente) return null;

  return (
    <>
      {marcaToVendedor && renderStraightArrow(marcaToVendedor, 'marca-vendedor')}
      {vendedorToCliente && renderStraightArrow(vendedorToCliente, 'vendedor-cliente')}

      <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeInPoint {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeParticle {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
      `}</style>
    </>
  );
}
