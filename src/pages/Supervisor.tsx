import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, AlertCircle, Users, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  especialidade_marca?: string;
}

interface Atendimento {
  id: string;
  marca_veiculo: string;
  modelo_veiculo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  vendedor_fixo_id: string | null;
  clientes: {
    nome: string;
    telefone: string;
  } | null;
  mensagens: Array<{
    conteudo: string;
    created_at: string;
    remetente_tipo: string;
  }>;
}

export default function Supervisor() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAtendimentos(), fetchVendedores()]);
    setLoading(false);
  };

  const fetchAtendimentos = async () => {
    const { data, error } = await supabase
      .from("atendimentos")
      .select(`
        *,
        clientes (nome, telefone),
        mensagens (conteudo, created_at, remetente_tipo)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching atendimentos:", error);
    } else {
      setAtendimentos(data || []);
    }
  };

  const fetchVendedores = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select(`
        id,
        nome,
        email,
        config_vendedores (especialidade_marca)
      `)
      .eq("role", "vendedor");

    if (error) {
      console.error("Error fetching vendedores:", error);
    } else {
      setVendedores(
        data?.map((v: any) => ({
          id: v.id,
          nome: v.nome,
          email: v.email,
          especialidade_marca: v.config_vendedores?.[0]?.especialidade_marca,
        })) || []
      );
    }
  };

  const atendimentosNaoAtribuidos = atendimentos.filter(
    (a) => !a.vendedor_fixo_id
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ia_respondendo: { label: "IA Respondendo", className: "bg-blue-500" },
      aguardando_cliente: { label: "Aguardando Cliente", className: "bg-yellow-500" },
      vendedor_intervindo: { label: "Vendedor Intervindo", className: "bg-green-500" },
      aguardando_orcamento: { label: "Aguardando Orçamento", className: "bg-orange-500" },
      aguardando_fechamento: { label: "Aguardando Fechamento", className: "bg-purple-500" },
      encerrado: { label: "Encerrado", className: "bg-gray-500" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-500" };
    return (
      <Badge className={`${config.className} text-white`}>{config.label}</Badge>
    );
  };

  const getLastMessage = (mensagens: Atendimento["mensagens"]) => {
    if (!mensagens || mensagens.length === 0) return "Sem mensagens";
    const last = mensagens[mensagens.length - 1];
    return last.conteudo.substring(0, 50) + (last.conteudo.length > 50 ? "..." : "");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <UserCog className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Painel do Supervisor</h1>
                <p className="text-muted-foreground">
                  Monitore atendimentos e gerencie a equipe
                </p>
              </div>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground px-4 py-2 text-sm">
            Supervisor
          </Badge>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="nao-atribuidos" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="nao-atribuidos" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Não Atribuídos ({atendimentosNaoAtribuidos.length})
              </TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-2">
                <Users className="h-4 w-4" />
                Vendedores ({vendedores.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nao-atribuidos" className="space-y-4">
              {atendimentosNaoAtribuidos.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum atendimento não atribuído
                    </p>
                  </CardContent>
                </Card>
              ) : (
                atendimentosNaoAtribuidos.map((atendimento) => (
                  <Card key={atendimento.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {atendimento.clientes?.nome || "Cliente não identificado"}
                          </CardTitle>
                          <CardDescription>
                            {atendimento.marca_veiculo} {atendimento.modelo_veiculo || ""}
                          </CardDescription>
                        </div>
                        {getStatusBadge(atendimento.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <strong>Última mensagem:</strong> {getLastMessage(atendimento.mensagens)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Atualizado: {format(new Date(atendimento.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="vendedores" className="space-y-4">
              {vendedores.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum vendedor habilitado
                    </p>
                  </CardContent>
                </Card>
              ) : (
                vendedores.map((vendedor) => {
                  const atendimentosVendedor = atendimentos.filter(
                    (a) => a.vendedor_fixo_id === vendedor.id
                  );

                  return (
                    <Card key={vendedor.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{vendedor.nome}</CardTitle>
                            <CardDescription>{vendedor.email}</CardDescription>
                          </div>
                          <Badge variant="outline">
                            {vendedor.especialidade_marca || "Sem especialidade"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Atendimentos ativos:</span>
                            <span className="font-semibold">{atendimentosVendedor.length}</span>
                          </div>
                          
                          {atendimentosVendedor.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                              {atendimentosVendedor.map((atendimento) => (
                                <div
                                  key={atendimento.id}
                                  className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30"
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {atendimento.clientes?.nome || "Cliente não identificado"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {atendimento.marca_veiculo} - {getLastMessage(atendimento.mensagens)}
                                    </div>
                                  </div>
                                  {getStatusBadge(atendimento.status)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
