import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Clock, CheckCircle2, RefreshCw, Shield, Package, ChevronDown, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Atendimento = {
  id: string;
  status: string;
  marca_veiculo: string;
  modelo_veiculo?: string;
  ano_veiculo?: string;
  placa?: string;
  chassi?: string;
  resumo_necessidade?: string;
  clientes: {
    nome: string;
    telefone: string;
  };
  mensagens: Array<{
    conteudo: string;
    created_at: string;
  }>;
};

type VendedorListas = {
  id: string;
  nome: string;
  email: string;
  orcamentos: Atendimento[];
  fechamento: Atendimento[];
  reembolsos: Atendimento[];
  garantias: Atendimento[];
  trocas: Atendimento[];
  resolvidos: Atendimento[];
};

export default function Orcamentos() {
  const [vendedores, setVendedores] = useState<VendedorListas[]>([]);
  const [loading, setLoading] = useState(true);
  const [openVendedores, setOpenVendedores] = useState<Set<string>>(new Set());
  const [openListas, setOpenListas] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchVendedoresListas();
  }, []);

  const fetchVendedoresListas = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get supervisor's usuario_id
      const { data: supervisorData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supervisorData) return;

      // Get assigned vendedores
      const { data: vendedoresAtribuidos } = await supabase
        .from('vendedor_supervisor')
        .select(`
          vendedor_id,
          usuarios!vendedor_supervisor_vendedor_id_fkey (
            id,
            nome,
            email
          )
        `)
        .eq('supervisor_id', supervisorData.id);

      if (!vendedoresAtribuidos) return;

      // Fetch atendimentos for each vendedor
      const vendedoresComListas = await Promise.all(
        vendedoresAtribuidos.map(async (v: any) => {
          const vendedor = v.usuarios;
          
          const { data: atendimentos } = await supabase
            .from('atendimentos')
            .select(`
              *,
              clientes (nome, telefone),
              mensagens (conteudo, created_at)
            `)
            .eq('vendedor_fixo_id', vendedor.id)
            .order('created_at', { ascending: false });

          const atendimentosArray = (atendimentos || []) as Atendimento[];

          return {
            id: vendedor.id,
            nome: vendedor.nome,
            email: vendedor.email,
            orcamentos: atendimentosArray.filter(a => a.status === 'aguardando_orcamento'),
            fechamento: atendimentosArray.filter(a => a.status === 'aguardando_fechamento'),
            reembolsos: atendimentosArray.filter(a => a.status === 'solicitacao_reembolso'),
            garantias: atendimentosArray.filter(a => a.status === 'solicitacao_garantia'),
            trocas: atendimentosArray.filter(a => a.status === 'solicitacao_troca'),
            resolvidos: atendimentosArray.filter(a => a.status === 'resolvido'),
          };
        })
      );

      setVendedores(vendedoresComListas);
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      toast({
        title: "Erro ao carregar listas",
        description: "Não foi possível carregar as listas dos vendedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVendedor = (vendedorId: string) => {
    setOpenVendedores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vendedorId)) {
        newSet.delete(vendedorId);
      } else {
        newSet.add(vendedorId);
      }
      return newSet;
    });
  };

  const toggleLista = (listaId: string) => {
    setOpenListas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listaId)) {
        newSet.delete(listaId);
      } else {
        newSet.add(listaId);
      }
      return newSet;
    });
  };

  const ListaSection = ({ 
    title, 
    icon: Icon, 
    items, 
    color,
    vendedorId,
    listaKey
  }: { 
    title: string; 
    icon: any; 
    items: Atendimento[]; 
    color: string;
    vendedorId: string;
    listaKey: string;
  }) => {
    const listaId = `${vendedorId}-${listaKey}`;
    const isOpen = openListas.has(listaId);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleLista(listaId)}>
        <Card className={`border-${color} bg-gradient-to-br from-${color}/5 to-transparent`}>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className={`flex items-center justify-between text-${color}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {title}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`bg-${color}/10 text-${color}`}>
                    {items.length}
                  </Badge>
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                  />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          {items.length > 0 && (
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <Card key={item.id} className="p-4 bg-background border border-border hover:border-primary/50 transition-colors">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-foreground text-lg">{item.clientes?.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.clientes?.telefone}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-${color} border-${color}`}>
                              {item.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-sm font-medium text-foreground">
                              Veículo: {item.marca_veiculo} {item.modelo_veiculo}
                            </p>
                            {item.ano_veiculo && (
                              <p className="text-xs text-muted-foreground">Ano: {item.ano_veiculo}</p>
                            )}
                            {item.placa && (
                              <p className="text-xs text-muted-foreground">Placa: {item.placa}</p>
                            )}
                          </div>

                          {item.resumo_necessidade && (
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs font-medium text-muted-foreground uppercase">Resumo:</p>
                              <p className="text-sm text-foreground">{item.resumo_necessidade}</p>
                            </div>
                          )}

                          {item.mensagens && item.mensagens.length > 0 && (
                            <div className="pt-2 border-t border-border/50">
                              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                Última Mensagem:
                              </p>
                              <p className="text-sm text-foreground line-clamp-2">
                                {item.mensagens[0]?.conteudo}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(item.mensagens[0]?.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          )}
        </Card>
      </Collapsible>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Listas</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as listas de atendimentos de cada vendedor
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando vendedores...</p>
            </CardContent>
          </Card>
        ) : vendedores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum vendedor atribuído</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vendedores.map((vendedor) => (
              <Collapsible
                key={vendedor.id}
                open={openVendedores.has(vendedor.id)}
                onOpenChange={() => toggleVendedor(vendedor.id)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-lg">{vendedor.nome}</CardTitle>
                            <CardDescription>{vendedor.email}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            <Badge variant="secondary">{vendedor.orcamentos.length} orçamentos</Badge>
                            <Badge variant="secondary">{vendedor.fechamento.length} fechamentos</Badge>
                          </div>
                          <ChevronDown 
                            className={`h-5 w-5 text-muted-foreground transition-transform ${
                              openVendedores.has(vendedor.id) ? 'transform rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <ListaSection
                          title="Orçamentos em Espera"
                          icon={FileText}
                          items={vendedor.orcamentos}
                          color="accent"
                          vendedorId={vendedor.id}
                          listaKey="orcamentos"
                        />
                        
                        <ListaSection
                          title="Aguardando Fechamento"
                          icon={CheckCircle2}
                          items={vendedor.fechamento}
                          color="success"
                          vendedorId={vendedor.id}
                          listaKey="fechamento"
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                          Solicitações Especiais
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <ListaSection
                            title="Reembolsos"
                            icon={RefreshCw}
                            items={vendedor.reembolsos}
                            color="destructive"
                            vendedorId={vendedor.id}
                            listaKey="reembolsos"
                          />
                          
                          <ListaSection
                            title="Garantias"
                            icon={Shield}
                            items={vendedor.garantias}
                            color="primary"
                            vendedorId={vendedor.id}
                            listaKey="garantias"
                          />
                          
                          <ListaSection
                            title="Trocas"
                            icon={Package}
                            items={vendedor.trocas}
                            color="secondary"
                            vendedorId={vendedor.id}
                            listaKey="trocas"
                          />
                          
                          <ListaSection
                            title="Resolvidos"
                            icon={CheckCircle2}
                            items={vendedor.resolvidos}
                            color="success"
                            vendedorId={vendedor.id}
                            listaKey="resolvidos"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
