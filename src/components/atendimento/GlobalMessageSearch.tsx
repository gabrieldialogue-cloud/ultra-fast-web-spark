import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, X, Calendar, User, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  conteudo: string;
  created_at: string;
  atendimento_id: string;
  remetente_tipo: string;
  cliente_nome?: string;
  cliente_telefone?: string;
  marca_veiculo?: string;
}

interface GlobalMessageSearchProps {
  onSelectAtendimento: (atendimentoId: string, messageId: string) => void;
}

export function GlobalMessageSearch({ onSelectAtendimento }: GlobalMessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResults(true);

    try {
      // Buscar mensagens
      const { data: mensagens, error } = await supabase
        .from("mensagens")
        .select(`
          id,
          conteudo,
          created_at,
          atendimento_id,
          remetente_tipo,
          atendimentos (
            clientes (
              nome,
              telefone
            ),
            marca_veiculo,
            modelo_veiculo
          )
        `)
        .ilike("conteudo", `%${searchQuery}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const results: SearchResult[] = (mensagens || []).map((msg: any) => ({
        id: msg.id,
        conteudo: msg.conteudo,
        created_at: msg.created_at,
        atendimento_id: msg.atendimento_id,
        remetente_tipo: msg.remetente_tipo,
        cliente_nome: msg.atendimentos?.clientes?.nome,
        cliente_telefone: msg.atendimentos?.clientes?.telefone,
        marca_veiculo: msg.atendimentos?.marca_veiculo,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-primary/30 font-semibold">{part}</mark> : 
        part
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por conteúdo, nome do cliente ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        {showResults && (
          <Button variant="outline" onClick={clearSearch}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Resultados da busca ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <Search className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem encontrada</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onSelectAtendimento(result.atendimento_id, result.id);
                        clearSearch();
                      }}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">
                            {result.cliente_nome || result.cliente_telefone || "Cliente"}
                          </span>
                          {result.marca_veiculo && (
                            <span className="text-xs text-muted-foreground">
                              • {result.marca_veiculo}
                            </span>
                          )}
                        </div>
                        <Badge variant={result.remetente_tipo === "vendedor" ? "secondary" : "outline"}>
                          {result.remetente_tipo === "vendedor" ? "Você" : "Cliente"}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2">
                        {highlightText(result.conteudo, searchQuery)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(result.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
