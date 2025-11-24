import { Tag, User, MessageSquare, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HierarchyFlowProps {
  selectedMarca: string | null;
  selectedVendedor: { nome: string; status_online?: boolean } | null;
  selectedCliente: { nome: string } | null;
  onMarcaClick: () => void;
  onVendedorClick: () => void;
  onClienteClick?: () => void;
}

export function HierarchyFlow({
  selectedMarca,
  selectedVendedor,
  selectedCliente,
  onMarcaClick,
  onVendedorClick,
  onClienteClick,
}: HierarchyFlowProps) {
  if (!selectedMarca && !selectedVendedor && !selectedCliente) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-card/50 backdrop-blur-sm border border-border rounded-lg shadow-sm animate-fade-in">
      {/* Marca */}
      {selectedMarca && (
        <>
          <button
            onClick={onMarcaClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              "bg-primary/10 border border-primary/30 hover:bg-primary/20 hover:border-primary/50",
              "hover:scale-105 active:scale-95"
            )}
          >
            <Tag className="h-4 w-4 text-primary" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-primary/70 font-medium">Marca</span>
              <span className="text-sm font-semibold text-primary">{selectedMarca}</span>
            </div>
          </button>

          {selectedVendedor && (
            <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" />
          )}
        </>
      )}

      {/* Vendedor */}
      {selectedVendedor && (
        <>
          <button
            onClick={onVendedorClick}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
              "border hover:scale-105 active:scale-95",
              selectedVendedor.status_online
                ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50"
                : "bg-muted/50 border-border hover:bg-muted hover:border-border/70"
            )}
          >
            <User
              className={cn(
                "h-4 w-4",
                selectedVendedor.status_online ? "text-green-600" : "text-muted-foreground"
              )}
            />
            <div className="flex flex-col items-start">
              <span
                className={cn(
                  "text-xs font-medium",
                  selectedVendedor.status_online ? "text-green-600/70" : "text-muted-foreground/70"
                )}
              >
                Vendedor
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  selectedVendedor.status_online ? "text-green-700" : "text-muted-foreground"
                )}
              >
                {selectedVendedor.nome}
              </span>
            </div>
            {selectedVendedor.status_online && (
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </button>

          {selectedCliente && (
            <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" />
          )}
        </>
      )}

      {/* Cliente */}
      {selectedCliente && (
        <button
          onClick={onClienteClick}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
            "bg-accent/10 border border-accent/30 hover:bg-accent/20 hover:border-accent/50",
            "hover:scale-105 active:scale-95",
            !onClienteClick && "cursor-default"
          )}
          disabled={!onClienteClick}
        >
          <MessageSquare className="h-4 w-4 text-accent-foreground" />
          <div className="flex flex-col items-start">
            <span className="text-xs text-accent-foreground/70 font-medium">Cliente</span>
            <span className="text-sm font-semibold text-accent-foreground">
              {selectedCliente.nome}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
