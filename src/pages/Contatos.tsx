import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Phone, Mail, Car, FileText, AlertCircle, Calendar } from "lucide-react";

export default function Contatos() {
  // Dados de exemplo para demonstração da estrutura
  const contatosExemplo = [
    {
      id: "1",
      nome: "João Silva",
      telefone: "+55 11 98765-4321",
      email: "joao.silva@email.com",
      veiculo: {
        marca: "Fiat",
        modelo: "Uno",
        ano: "2020",
        placa: "ABC-1234"
      },
      orcamentos: [
        { id: "orc1", descricao: "Troca de óleo e filtro", valor: 350, status: "aprovado", data: "2024-01-15" },
        { id: "orc2", descricao: "Pastilhas de freio", valor: 480, status: "aguardando", data: "2024-01-20" }
      ],
      problemas: [
        { tipo: "garantia", descricao: "Problema no motor após 1 mês", data: "2024-01-10" },
        { tipo: "orcamento", descricao: "Peça original do para-brisa", data: "2024-01-20" }
      ],
      ultimoContato: "2024-01-20"
    }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
            <p className="text-muted-foreground">
              Todos os clientes e histórico completo de interações
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, placa, modelo..."
                className="pl-10 bg-background/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacts List */}
        <div className="grid gap-4">
          {contatosExemplo.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Nenhum contato registrado ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            contatosExemplo.map((contato) => (
              <Card key={contato.id} className="border-border/50 hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{contato.nome}</CardTitle>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contato.telefone}
                        </div>
                        {contato.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contato.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Último contato: {new Date(contato.ultimoContato).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="veiculo" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="veiculo">
                        <Car className="h-4 w-4 mr-2" />
                        Veículo
                      </TabsTrigger>
                      <TabsTrigger value="orcamentos">
                        <FileText className="h-4 w-4 mr-2" />
                        Orçamentos ({contato.orcamentos.length})
                      </TabsTrigger>
                      <TabsTrigger value="problemas">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Problemas ({contato.problemas.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="veiculo" className="space-y-4">
                      <Card className="border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Marca</p>
                              <p className="font-semibold text-foreground">{contato.veiculo.marca}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Modelo</p>
                              <p className="font-semibold text-foreground">{contato.veiculo.modelo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Ano</p>
                              <p className="font-semibold text-foreground">{contato.veiculo.ano}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Placa</p>
                              <p className="font-semibold text-foreground">{contato.veiculo.placa}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="orcamentos" className="space-y-3">
                      {contato.orcamentos.map((orc) => (
                        <Card key={orc.id} className="border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">{orc.descricao}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(orc.data).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="font-bold text-lg text-foreground">
                                  R$ {orc.valor.toFixed(2)}
                                </p>
                                <Badge 
                                  className={
                                    orc.status === "aprovado" 
                                      ? "bg-success" 
                                      : "bg-altese-gray-medium"
                                  }
                                >
                                  {orc.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="problemas" className="space-y-3">
                      {contato.problemas.map((prob, idx) => (
                        <Card key={idx} className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-gradient-to-r from-primary to-secondary">
                                    {prob.tipo}
                                  </Badge>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(prob.data).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <p className="text-foreground">{prob.descricao}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
