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

  const ListaSection = ({ 
    title, 
    icon: Icon, 
    items, 
    color 
  }: { 
    title: string; 
    icon: any; 
    items: Atendimento[]; 
    color: string;
  }) => (
    <Card className={`border-${color} bg-gradient-to-br from-${color}/5 to-transparent`}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between text-${color}`}>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </div>
          <Badge variant="secondary" className={`bg-${color}/10 text-${color}`}>
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      {items.length > 0 && (
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-background border border-border">
                  <p className="font-medium text-foreground">{item.clientes?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.marca_veiculo} {item.modelo_veiculo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.clientes?.telefone}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );

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
                        />
                        
                        <ListaSection
                          title="Aguardando Fechamento"
                          icon={CheckCircle2}
                          items={vendedor.fechamento}
                          color="success"
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
                          />
                          
                          <ListaSection
                            title="Garantias"
                            icon={Shield}
                            items={vendedor.garantias}
                            color="primary"
                          />
                          
                          <ListaSection
                            title="Trocas"
                            icon={Package}
                            items={vendedor.trocas}
                            color="secondary"
                          />
                          
                          <ListaSection
                            title="Resolvidos"
                            icon={CheckCircle2}
                            items={vendedor.resolvidos}
                            color="success"
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
