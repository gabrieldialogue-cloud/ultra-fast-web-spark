import { useEffect, useState, useCallback } from "react";

interface ConnectionArrowsProps {
  selectedMarca: string | null;
  selectedVendedor: { id: string } | null;
}

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Connection {
  from: Position;
  to: Position;
  id: string;
}

export function ConnectionArrows({ selectedMarca, selectedVendedor }: ConnectionArrowsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);

  const calculateConnections = useCallback(() => {
    const newConnections: Connection[] = [];

    // Conexões Marca -> Vendedores
    if (selectedMarca) {
      const marcaElement = document.querySelector(`[data-marca="${selectedMarca}"]`);
      const vendedorElements = document.querySelectorAll(`[data-vendedor-marca="${selectedMarca}"]`);

      if (marcaElement && vendedorElements.length > 0) {
        const marcaRect = marcaElement.getBoundingClientRect();
        const marcaPos: Position = {
          x: marcaRect.right,
          y: marcaRect.top + marcaRect.height / 2,
          width: marcaRect.width,
          height: marcaRect.height,
        };

        vendedorElements.forEach((vendedorEl, index) => {
          const vendedorRect = vendedorEl.getBoundingClientRect();
          const vendedorPos: Position = {
            x: vendedorRect.left,
            y: vendedorRect.top + vendedorRect.height / 2,
            width: vendedorRect.width,
            height: vendedorRect.height,
          };

          newConnections.push({
            from: marcaPos,
            to: vendedorPos,
            id: `marca-vendedor-${index}`,
          });
        });
      }
    }

    // Conexões Vendedor -> Clientes
    if (selectedVendedor) {
      const vendedorElement = document.querySelector(`[data-vendedor-id="${selectedVendedor.id}"]`);
      const clienteElements = document.querySelectorAll(`[data-cliente-vendedor="${selectedVendedor.id}"]`);

      if (vendedorElement && clienteElements.length > 0) {
        const vendedorRect = vendedorElement.getBoundingClientRect();
        const vendedorPos: Position = {
          x: vendedorRect.right,
          y: vendedorRect.top + vendedorRect.height / 2,
          width: vendedorRect.width,
          height: vendedorRect.height,
        };

        clienteElements.forEach((clienteEl, index) => {
          const clienteRect = clienteEl.getBoundingClientRect();
          const clientePos: Position = {
            x: clienteRect.left,
            y: clienteRect.top + clienteRect.height / 2,
            width: clienteRect.width,
            height: clienteRect.height,
          };

          newConnections.push({
            from: vendedorPos,
            to: clientePos,
            id: `vendedor-cliente-${index}`,
          });
        });
      }
    }

    setConnections(newConnections);
  }, [selectedMarca, selectedVendedor]);

  useEffect(() => {
    // Calcular conexões inicialmente
    const timer = setTimeout(() => {
      calculateConnections();
    }, 100);

    // Recalcular em scroll e resize
    const handleUpdate = () => {
      calculateConnections();
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [calculateConnections]);

  // Recalcular quando as seleções mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateConnections();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedMarca, selectedVendedor, calculateConnections]);

  if (connections.length === 0) return null;

  const createPath = (from: Position, to: Position): string => {
    // Adicionar pequeno offset para começar/terminar na borda dos cards
    const startX = from.x;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;

    // Calcular ponto de controle para curva suave
    const midX = (startX + endX) / 2;
    const curve = Math.abs(endY - startY) * 0.3;

    // Criar curva bezier suave
    return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${midX} ${startY}, ${midX} ${(startY + endY) / 2} S ${endX - curve} ${endY}, ${endX} ${endY}`;
  };

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-10"
      style={{ width: "100vw", height: "100vh" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            className="fill-primary"
          />
        </marker>

        {/* Gradiente para as linhas */}
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" className="stop-primary/40" />
          <stop offset="50%" className="stop-primary" />
          <stop offset="100%" className="stop-primary/40" />
        </linearGradient>
      </defs>

      {connections.map((connection) => (
        <g key={connection.id}>
          {/* Linha de fundo (glow) */}
          <path
            d={createPath(connection.from, connection.to)}
            fill="none"
            className="stroke-primary/20"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Linha principal animada */}
          <path
            d={createPath(connection.from, connection.to)}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            className="animate-draw-line"
            style={{
              strokeDasharray: "1000",
              strokeDashoffset: "1000",
              animation: "drawLine 1.5s ease-out forwards",
            }}
          />

          {/* Partículas animadas */}
          <circle
            r="4"
            className="fill-primary animate-pulse"
            style={{
              offsetPath: `path('${createPath(connection.from, connection.to)}')`,
              offsetDistance: "0%",
              animation: "moveAlongPath 3s linear infinite",
            }}
          >
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path={createPath(connection.from, connection.to)}
            />
          </circle>
        </g>
      ))}

      <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes moveAlongPath {
          0% {
            offset-distance: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            offset-distance: 100%;
            opacity: 0;
          }
        }

        .stop-primary\/40 {
          stop-color: hsl(var(--primary));
          stop-opacity: 0.4;
        }

        .stop-primary {
          stop-color: hsl(var(--primary));
          stop-opacity: 1;
        }
      `}</style>
    </svg>
  );
}
