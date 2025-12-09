import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AudioRecorder } from "@/components/chat/AudioRecorder";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { WhatsAppWindowAlert } from "@/components/chat/WhatsAppWindowAlert";
import { UnifiedSearch } from "@/components/atendimento/UnifiedSearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useLastMessages } from "@/hooks/useLastMessages";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useWhatsAppWindow } from "@/hooks/useWhatsAppWindow";
import { useTypingBroadcast } from "@/hooks/useTypingBroadcast";
import { useClientPresence } from "@/hooks/useClientPresence";
import { compressImage, shouldCompress } from "@/lib/imageCompression";
import { 
  Phone, MessageSquare, Send, Paperclip, Loader2, Clock, Bot,
  Check, CheckCheck, Sparkles, X, AlertCircle, Image as ImageIcon,
  File, Images, Mic, Copy, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeleteContactDialog } from "@/components/contatos/DeleteContactDialog";

interface PersonalNumberChatProps {
  vendedorId: string;
  vendedorNome: string;
}

export function PersonalNumberChat({ vendedorId, vendedorNome }: PersonalNumberChatProps) {
  const [evolutionInstance, setEvolutionInstance] = useState<string | null>(null);
  const [evolutionStatus, setEvolutionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [suppressAutoScroll, setSuppressAutoScroll] = useState(false);
  const [deletingContactInfo, setDeletingContactInfo] = useState<{ clienteId: string; clienteNome: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const prevSelectedAtendimentoId = useRef<string | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Atualiza "agora" a cada minuto para recalcular o "visto por último"
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch vendedor's Evolution instance and sync status
  useEffect(() => {
    const fetchEvolutionInstance = async () => {
      setLoading(true);
      try {
        console.log('[PersonalNumberChat] Fetching config for vendedorId:', vendedorId);
        
        const { data, error } = await supabase
          .from('config_vendedores')
          .select('evolution_instance_name, evolution_status')
          .eq('usuario_id', vendedorId)
          .single();

        console.log('[PersonalNumberChat] Config result:', { data, error });

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching vendedor config:', error);
        }

        if (data?.evolution_instance_name) {
          setEvolutionInstance(data.evolution_instance_name);
          setEvolutionStatus(data.evolution_status || null);
          
          // Sync status from Evolution API and update database
          await syncEvolutionStatus(data.evolution_instance_name);
          
          // Fetch atendimentos for this instance
          await fetchAtendimentos(data.evolution_instance_name);
        } else {
          console.log('[PersonalNumberChat] No evolution instance configured for vendedor');
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvolutionInstance();
  }, [vendedorId]);

  // Sync Evolution status from API
  const syncEvolutionStatus = async (instanceName: string) => {
    try {
      console.log('[PersonalNumberChat] Syncing status for instance:', instanceName);
      
      const { data: config } = await supabase
        .from('evolution_config')
        .select('api_url, api_key, is_connected')
        .single();
      
      if (!config?.is_connected || !config.api_url || !config.api_key) {
        console.log('[PersonalNumberChat] Evolution not connected globally');
        return;
      }
      
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;
      
      const response = await fetch('https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/manage-evolution-instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          action: 'check_instance_status',
          evolutionApiUrl: config.api_url,
          evolutionApiKey: config.api_key,
          instanceData: { 
            instanceName,
            updateDatabase: true
          }
        })
      });
      
      const result = await response.json();
      console.log('[PersonalNumberChat] Status sync result:', result);
      
      if (result.success && result.status) {
        let newStatus = 'disconnected';
        if (result.status === 'open' || result.status === 'connected') {
          newStatus = 'connected';
        } else if (result.status === 'connecting') {
          newStatus = 'connecting';
        } else if (result.status === 'pending_qr' || result.status === 'qrcode') {
          newStatus = 'pending_qr';
        }
        
        setEvolutionStatus(newStatus);
        console.log('[PersonalNumberChat] Updated status to:', newStatus);
      }
    } catch (error) {
      console.error('[PersonalNumberChat] Error syncing status:', error);
    }
  };

  const fetchAtendimentos = async (instanceName: string) => {
    try {
      console.log('[PersonalNumberChat] Fetching atendimentos for instance:', instanceName);
      
      const { data, error } = await supabase
        .from('atendimentos')
        .select(`
          id,
          cliente_id,
          marca_veiculo,
          modelo_veiculo,
          status,
          created_at,
          source,
          evolution_instance_name,
          clientes (nome, telefone, push_name, profile_picture_url)
        `)
        .eq('evolution_instance_name', instanceName)
        .eq('source', 'evolution')
        .neq('status', 'encerrado')
        .order('updated_at', { ascending: false });

      console.log('[PersonalNumberChat] Atendimentos query result:', { data, error, count: data?.length });

      if (error) {
        console.error('Error fetching atendimentos:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('[PersonalNumberChat] No atendimentos found for this instance');
        setAtendimentos([]);
        return;
      }

      // Get last message time for each
      const atendimentosWithLastMsg = await Promise.all(
        (data || []).map(async (atendimento) => {
          const { data: lastMsg } = await supabase
            .from('mensagens')
            .select('created_at')
            .eq('atendimento_id', atendimento.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...atendimento,
            ultima_mensagem_at: lastMsg?.[0]?.created_at || atendimento.created_at
          };
        })
      );

      // Sort by most recent message
      const sorted = atendimentosWithLastMsg.sort((a, b) =>
        new Date(b.ultima_mensagem_at).getTime() - new Date(a.ultima_mensagem_at).getTime()
      );

      console.log('[PersonalNumberChat] Final atendimentos list:', sorted.length);
      setAtendimentos(sorted);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Realtime updates for atendimentos list
  useEffect(() => {
    if (evolutionInstance) {
      const channel = supabase
        .channel('atendimentos-realtime-personal', {
          config: { broadcast: { self: false } }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'atendimentos'
          },
          () => {
            fetchAtendimentos(evolutionInstance);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens'
          },
          () => {
            fetchAtendimentos(evolutionInstance);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [evolutionInstance]);

  // Realtime messages
  const {
    messages,
    loading: loadingMessages,
    isClientTyping,
    addOptimisticMessage,
    updateMessage,
    removeOptimisticMessage,
    notifyMessageChange,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingOlder,
    markMessagesAsRead
  } = useRealtimeMessages({
    atendimentoId: selectedAtendimentoId,
    vendedorId,
    enabled: !!selectedAtendimentoId
  });

  // Unread counts
  const { unreadCounts, clearUnreadCount } = useUnreadCounts({
    atendimentos,
    vendedorId,
    enabled: true,
    currentAtendimentoId: selectedAtendimentoId
  });

  // Last messages
  const { lastMessages } = useLastMessages({
    atendimentos,
    enabled: true
  });

  // Client presence
  const { clientPresence } = useClientPresence({
    atendimentos,
    enabled: true
  });

  // WhatsApp 24h window
  const { isWindowClosed, lastClientMessageAt, hoursSinceLast } = useWhatsAppWindow({
    messages,
    enabled: !!selectedAtendimentoId,
  });

  // Typing broadcast
  useTypingBroadcast(selectedAtendimentoId, isTyping, 'vendedor');

  // Get selected atendimento data
  const selectedAtendimento = atendimentos.find(a => a.id === selectedAtendimentoId);
  const clienteTelefone = selectedAtendimento?.clientes?.telefone;

  // Filter atendimentos by search
  const filteredAtendimentos = atendimentos.filter(a => {
    if (!searchTerm) return true;
    const nome = a.clientes?.push_name || a.clientes?.nome || '';
    const telefone = a.clientes?.telefone || '';
    const marca = a.marca_veiculo || '';
    return (
      nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      telefone.includes(searchTerm) ||
      marca.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Auto scroll to bottom quando um novo atendimento é selecionado
  useEffect(() => {
    if (
      selectedAtendimentoId &&
      prevSelectedAtendimentoId.current !== selectedAtendimentoId
    ) {
      prevSelectedAtendimentoId.current = selectedAtendimentoId;
      
      setTimeout(() => {
        if (scrollRef.current) {
          const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          }
        }
      }, 150);
    }
  }, [selectedAtendimentoId]);

  // Also scroll when new message arrives
  useEffect(() => {
    if (messages.length > 0 && !isLoadingOlder && !suppressAutoScroll) {
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage || lastMessage.id === lastMessageIdRef.current) return;
      lastMessageIdRef.current = lastMessage.id;

      if (lastMessage.remetente_tipo !== 'vendedor') {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [messages, isLoadingOlder, suppressAutoScroll]);

  // Handler para carregar mensagens antigas preservando a posição do scroll
  const handleLoadOlderMessages = async () => {
    setSuppressAutoScroll(true);

    const viewport = scrollRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement | null;

    const prevScrollHeight = viewport?.scrollHeight ?? 0;
    const prevScrollTop = viewport?.scrollTop ?? 0;

    await loadMoreMessages();

    requestAnimationFrame(() => {
      const newScrollHeight = viewport?.scrollHeight ?? 0;
      if (viewport) {
        const deltaHeight = newScrollHeight - prevScrollHeight;
        viewport.scrollTop = prevScrollTop + deltaHeight;
      }
      setTimeout(() => setSuppressAutoScroll(false), 100);
    });
  };

  // Handle message input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    setIsTyping(e.target.value.length > 0);
  };

  // Handle keypress
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedAtendimentoId || isSending) return;

    const trimmedMessage = messageInput.trim();
    if (trimmedMessage.length > 1000) {
      toast.error("Mensagem muito longa. Máximo de 1000 caracteres.");
      return;
    }

    setIsSending(true);
    setIsTyping(false);
    const messageCopy = trimmedMessage;
    setMessageInput("");

    const formattedMessage = `*${vendedorNome}:*\n${messageCopy}`;

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      atendimento_id: selectedAtendimentoId,
      remetente_id: vendedorId,
      remetente_tipo: 'vendedor',
      conteudo: messageCopy,
      created_at: new Date().toISOString(),
      attachment_url: null,
      attachment_type: null,
      attachment_filename: null,
      read_at: null,
      read_by_id: null,
      whatsapp_message_id: null,
      delivered_at: null,
      source: 'evolution',
      status: "enviando" as const
    };

    try {
      addOptimisticMessage(optimisticMessage);

      const { data: dbData, error: dbError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: selectedAtendimentoId,
          remetente_id: vendedorId,
          remetente_tipo: 'vendedor',
          conteudo: messageCopy,
          source: 'evolution'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      updateMessage(optimisticMessage.id, { ...dbData, status: "enviada" as const });
      await notifyMessageChange(dbData.id);

      // Send via Evolution API
      if (clienteTelefone && evolutionInstance) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          fetch(`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`
            },
            body: JSON.stringify({
              to: clienteTelefone,
              message: formattedMessage,
              source: 'evolution',
              evolutionInstanceName: evolutionInstance
            })
          }).then(async (res) => {
            const data = await res.json();
            if (data?.messageId) {
              await supabase
                .from('mensagens')
                .update({ whatsapp_message_id: data.messageId })
                .eq('id', dbData.id);
            }
          }).catch(err => console.error('WhatsApp send error:', err));
        }
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      removeOptimisticMessage(optimisticMessage.id);
      setMessageInput(messageCopy);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20971520) {
      toast.error("Arquivo muito grande. Máximo de 20MB.");
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
      'text/plain', 'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado.");
      return;
    }

    if (shouldCompress(file)) {
      try {
        toast.info("Comprimindo imagem...");
        const compressedBlob = await compressImage(file);
        const compressedFile = Object.assign(compressedBlob, {
          name: file.name.replace(/\.[^.]+$/, '.jpg'),
          lastModified: Date.now(),
        }) as File;
        setSelectedFile(compressedFile);
        toast.success("Imagem comprimida com sucesso!");
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error("Erro ao comprimir imagem. Usando original.");
        setSelectedFile(file);
      }
    } else {
      setSelectedFile(file);
    }
  };

  // Upload file and send message
  const handleSendWithFile = async () => {
    if (!selectedFile || !selectedAtendimentoId || !vendedorId) return;

    setIsUploading(true);
    setIsTyping(false);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedAtendimentoId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      const isImage = selectedFile.type.startsWith('image/');
      const attachmentType = isImage ? 'image' : 'document';
      const mediaType = isImage ? 'image' : 'document';

      if (!clienteTelefone) {
        throw new Error('Telefone do cliente não encontrado');
      }

      // Send via Evolution API
      const { data: session } = await supabase.auth.getSession();
      if (session?.session && evolutionInstance) {
        await fetch(`https://ptwrrcqttnvcvlnxsvut.supabase.co/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`
          },
          body: JSON.stringify({
            to: clienteTelefone,
            mediaType,
            mediaUrl: publicUrl,
            filename: selectedFile.name,
            caption: messageInput.trim() || (isImage ? undefined : selectedFile.name),
            source: 'evolution',
            evolutionInstanceName: evolutionInstance
          })
        });
      }

      // Save message with attachment
      const { error: messageError } = await supabase
        .from('mensagens')
        .insert({
          atendimento_id: selectedAtendimentoId,
          remetente_id: vendedorId,
          remetente_tipo: 'vendedor',
          conteudo: messageInput.trim() || (isImage ? '[Imagem]' : `[Documento: ${selectedFile.name}]`),
          attachment_url: publicUrl,
          attachment_type: attachmentType,
          attachment_filename: selectedFile.name,
          source: 'evolution'
        });

      if (messageError) throw messageError;

      setMessageInput("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast.success("Arquivo enviado com sucesso!");

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Erro ao enviar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  };

  // Handle audio recorded
  const handleAudioRecorded = async (audioBlob: Blob) => {
    if (!selectedAtendimentoId) return;

    try {
      const fileName = `${Date.now()}-audio.ogg`;
      const filePath = `${selectedAtendimentoId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-audios')
        .upload(filePath, audioBlob, { contentType: 'audio/ogg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-audios')
        .getPublicUrl(filePath);

      if (!clienteTelefone) {
        throw new Error('Telefone do cliente não encontrado');
      }

      // Send audio via Evolution API
      const { data: session } = await supabase.auth.getSession();
      if (session?.session && evolutionInstance) {
        const { data, error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            to: clienteTelefone,
            audioUrl: publicUrl,
            source: 'evolution',
            evolutionInstanceName: evolutionInstance
          },
        });

        if (error) throw error;

        // Save message to database
        const { error: dbError } = await supabase
          .from('mensagens')
          .insert({
            atendimento_id: selectedAtendimentoId,
            conteudo: '[Áudio]',
            remetente_tipo: 'vendedor',
            remetente_id: vendedorId,
            attachment_url: publicUrl,
            attachment_type: 'audio',
            attachment_filename: fileName,
            whatsapp_message_id: data?.messageId,
            source: 'evolution'
          });

        if (dbError) throw dbError;
      }

      toast.success('Áudio enviado com sucesso!');
    } catch (error) {
      console.error("Erro ao enviar áudio:", error);
      toast.error('Erro ao enviar áudio');
      throw error;
    }
  };

  // Generate AI response suggestion
  const handleGenerateSuggestion = async () => {
    if (!selectedAtendimentoId || isGeneratingSuggestion) return;

    try {
      setIsGeneratingSuggestion(true);

      const recentMessages = messages.slice(-5).map(msg => ({
        role: msg.remetente_tipo === 'cliente' ? 'user' : 'assistant',
        content: msg.conteudo
      }));

      const lastClientMessage = [...messages].reverse().find(
        msg => msg.remetente_tipo === 'cliente'
      );

      if (!lastClientMessage) {
        toast.error("Nenhuma mensagem do cliente encontrada");
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-response-suggestion', {
        body: {
          clientMessage: lastClientMessage.conteudo,
          conversationContext: recentMessages.slice(0, -1)
        }
      });

      if (error) {
        toast.error(`Erro: ${error.message || 'Falha ao gerar sugestão'}`);
        return;
      }

      if (!data?.suggestedResponse || data.suggestedResponse.trim() === '') {
        toast.error("A IA não conseguiu gerar uma resposta. Tente novamente.");
        return;
      }

      setMessageInput(data.suggestedResponse);
      messageInputRef.current?.focus();
      toast.success("Sugestão gerada! Revise antes de enviar.");
    } catch (error) {
      console.error('Erro ao gerar sugestão:', error);
      toast.error("Erro ao gerar sugestão de resposta");
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ia_respondendo: { label: "IA Respondendo", variant: "secondary" },
      aguardando_cliente: { label: "Aguardando Cliente", variant: "outline" },
      vendedor_intervindo: { label: "Você está atendendo", variant: "default" },
      aguardando_orcamento: { label: "Aguardando Orçamento", variant: "secondary" },
      aguardando_fechamento: { label: "Aguardando Fechamento", variant: "default" },
    };

    const config = statusMap[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Loading state
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // No Evolution instance configured
  if (!evolutionInstance) {
    return (
      <Card className="rounded-2xl border-accent bg-gradient-to-br from-accent/10 to-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Phone className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Número Pessoal Não Configurado</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Você ainda não tem uma instância do WhatsApp configurada para seu número pessoal. 
            Entre em contato com o administrador para configurar sua instância.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Evolution not connected
  if (evolutionStatus !== 'connected') {
    return (
      <Card className="rounded-2xl border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">WhatsApp Desconectado</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Sua instância do WhatsApp ({evolutionInstance}) está desconectada. 
            Entre em contato com o administrador para reconectar.
          </p>
          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
            Status: {evolutionStatus || 'Desconhecido'}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border-primary bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent shadow-xl transition-all duration-500 ease-in-out">
        <CardHeader className="border-b border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Phone className="h-6 w-6 text-primary" />
                Número Pessoal - Chat ao Vivo
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Conversas do seu número pessoal via Evolution API
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-2 text-lg font-bold">
                {filteredAtendimentos.length} ativas
              </Badge>
              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1">
                {evolutionInstance}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {atendimentos.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-primary/40 mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhuma conversa ativa no momento
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Quando clientes enviarem mensagens para seu número pessoal, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
              {/* Lista de Atendimentos */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Conversas Ativas ({filteredAtendimentos.length})
                  </CardTitle>
                  <div className="mt-3">
                    <UnifiedSearch 
                      onSearchChange={(query) => setSearchTerm(query)}
                      onSelectMessage={(atendimentoId, messageId) => {
                        setSelectedAtendimentoId(atendimentoId);
                        setHighlightedMessageId(messageId);
                        clearUnreadCount(atendimentoId);
                        markMessagesAsRead(atendimentoId);
                        setTimeout(() => setHighlightedMessageId(null), 3000);
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[70vh]">
                    {filteredAtendimentos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full px-4 py-6 text-muted-foreground">
                        <MessageSquare className="h-6 w-6 mb-2 opacity-50" />
                        <p className="text-xs">Nenhum atendimento encontrado</p>
                      </div>
                    ) : (
                      <div className="relative space-y-2 px-3 py-2">
                        <div className="relative space-y-2">
                          {[...filteredAtendimentos].sort((a, b) => {
                            const unreadA = unreadCounts[a.id] || 0;
                            const unreadB = unreadCounts[b.id] || 0;
                            
                            if (unreadA > 0 && unreadB === 0) return -1;
                            if (unreadA === 0 && unreadB > 0) return 1;
                            
                            const dateA = new Date(lastMessages[a.id]?.createdAt || a.created_at).getTime();
                            const dateB = new Date(lastMessages[b.id]?.createdAt || b.created_at).getTime();
                            return dateB - dateA;
                          }).map((atendimento) => (
                            <button
                              key={atendimento.id}
                              onClick={() => {
                                setSelectedAtendimentoId(atendimento.id);
                                clearUnreadCount(atendimento.id);
                                markMessagesAsRead(atendimento.id);
                              }}
                              className={`w-full text-left px-2.5 py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] bg-gradient-to-b from-accent/8 to-transparent ${
                                selectedAtendimentoId === atendimento.id 
                                  ? 'border-2 border-primary shadow-md bg-primary/5 ring-2 ring-primary/20' 
                                  : 'border-2 border-border hover:border-primary/30 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <ClientAvatar
                                    name={atendimento.clientes?.push_name || atendimento.clientes?.nome || 'Cliente'}
                                    imageUrl={atendimento.clientes?.profile_picture_url}
                                    className="h-10 w-10 border border-accent/30 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-sm block truncate">
                                        {atendimento.clientes?.push_name || atendimento.clientes?.nome || "Cliente"}
                                      </span>
                                      {unreadCounts[atendimento.id] > 0 && (
                                        <Badge 
                                          variant="destructive" 
                                          className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] animate-pulse"
                                        >
                                          {unreadCounts[atendimento.id]}
                                        </Badge>
                                      )}
                                      {clientPresence[atendimento.id]?.isTyping && (
                                        <span className="text-[10px] text-success font-medium flex items-center gap-0.5 shrink-0">
                                          <span className="inline-block h-1 w-1 rounded-full bg-success animate-pulse" />
                                          digitando
                                        </span>
                                      )}
                                      {!clientPresence[atendimento.id]?.isTyping && clientPresence[atendimento.id]?.isOnline && (
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success shrink-0" title="Online" />
                                      )}
                                    </div>
                                    {atendimento.clientes?.telefone && (
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(atendimento.clientes.telefone);
                                          toast.success("Número copiado!");
                                        }}
                                        className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors max-w-full cursor-pointer"
                                        title="Copiar número"
                                      >
                                        <Phone className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">{atendimento.clientes.telefone}</span>
                                        <Copy className="h-2 w-2 shrink-0" />
                                      </div>
                                    )}
                                    {lastMessages[atendimento.id] ? (
                                      <div className="flex items-start gap-0.5 mt-1">
                                        {lastMessages[atendimento.id].attachmentType && (
                                          lastMessages[atendimento.id].attachmentType === 'image' ? (
                                            <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                          ) : lastMessages[atendimento.id].attachmentType === 'audio' ? (
                                            <Mic className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                          ) : (
                                            <File className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                          )
                                        )}
                                        <span className="text-[11px] text-muted-foreground line-clamp-1 break-words flex-1">
                                          {lastMessages[atendimento.id].remetenteTipo === 'vendedor' && (
                                            <span className="font-medium">Você: </span>
                                          )}
                                          {lastMessages[atendimento.id].attachmentType 
                                            ? lastMessages[atendimento.id].attachmentType === 'image' 
                                              ? 'Imagem' 
                                              : lastMessages[atendimento.id].attachmentType === 'audio'
                                                ? 'Áudio'
                                                : 'Doc'
                                            : (lastMessages[atendimento.id].conteudo?.substring(0, 35) || 'Msg') + 
                                              (lastMessages[atendimento.id].conteudo?.length > 35 ? '...' : '')}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground mt-1 block">
                                        Sem mensagens
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 shrink-0 ml-0.5">
                                  <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                    <span className="whitespace-nowrap text-[11px]">
                                      {format(new Date(lastMessages[atendimento.id]?.createdAt || atendimento.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                  {lastMessages[atendimento.id]?.remetenteTipo === 'vendedor' && (
                                    <span className="flex items-center">
                                      {lastMessages[atendimento.id].readAt ? (
                                        <CheckCheck className="h-2 w-2 text-success" />
                                      ) : lastMessages[atendimento.id].deliveredAt ? (
                                        <CheckCheck className="h-2 w-2 opacity-60" />
                                      ) : (
                                        <Check className="h-2 w-2 opacity-60" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-[11px] text-muted-foreground truncate flex-1 min-w-0">
                                  {atendimento.marca_veiculo} {atendimento.modelo_veiculo}
                                </p>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {lastMessages[atendimento.id]?.isWindowExpired && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-[10px] gap-0.5 px-1 py-0 h-4 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      title="Janela de 24h expirada"
                                    >
                                      <Clock className="h-2.5 w-2.5" />
                                      24h
                                    </Badge>
                                  )}
                                  {getStatusBadge(atendimento.status)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="lg:col-span-1 flex flex-col h-[calc(100vh-60px)]">
                {/* Header do Chat */}
                <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">Chat</span>
                    <span className="text-muted-foreground text-xs">|</span>
                    <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <Images className="h-3.5 w-3.5" />
                      Mídias
                    </button>
                  </div>
                  {selectedAtendimentoId && (
                    <button
                      onClick={() => {
                        const atendimento = atendimentos.find(a => a.id === selectedAtendimentoId);
                        if (atendimento?.cliente_id && atendimento?.clientes?.nome) {
                          setDeletingContactInfo({
                            clienteId: atendimento.cliente_id,
                            clienteNome: atendimento.clientes.nome,
                          });
                        }
                      }}
                      className="p-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Excluir contato"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Messages Area */}
                <div 
                  className="flex-1 overflow-hidden"
                  style={selectedAtendimentoId ? {
                    backgroundImage:
                      "linear-gradient(to right, hsl(var(--muted)/0.25) 1px, transparent 1px)," +
                      "linear-gradient(to bottom, hsl(var(--muted)/0.25) 1px, transparent 1px)," +
                      "radial-gradient(circle at 20% 20%, hsl(var(--primary)/0.20) 0, transparent 55%)," +
                      "radial-gradient(circle at 80% 80%, hsl(var(--accent)/0.20) 0, transparent 55%)",
                    backgroundSize: "18px 18px, 18px 18px, 100% 100%, 100% 100%",
                  } : {}}
                >
                  <ScrollArea className="h-full" ref={scrollRef}>
                    <div className="p-3">
                      {!selectedAtendimentoId ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-6 min-h-[300px]">
                          <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                          <p>Selecione um atendimento para ver as mensagens</p>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                          <Bot className="h-12 w-12 mb-4 opacity-50" />
                          <p>Nenhuma mensagem ainda</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {hasMoreMessages && (
                            <div className="flex justify-center pb-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLoadOlderMessages}
                                disabled={loadingMessages}
                                className="text-xs"
                              >
                                {loadingMessages ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                    Carregando...
                                  </>
                                ) : (
                                  'Carregar mensagens antigas'
                                )}
                              </Button>
                            </div>
                          )}
                          
                          {messages.map((mensagem, index) => {
                            const previousMessage = index > 0 ? messages[index - 1] : null;
                            const showSenderName = !previousMessage || previousMessage.remetente_tipo !== mensagem.remetente_tipo;
                            
                            return (
                              <ChatMessage
                                key={mensagem.id}
                                messageId={mensagem.id}
                                remetenteTipo={mensagem.remetente_tipo as "cliente" | "ia" | "supervisor" | "vendedor"}
                                conteudo={mensagem.conteudo}
                                createdAt={mensagem.created_at}
                                attachmentUrl={mensagem.attachment_url}
                                attachmentType={mensagem.attachment_type}
                                attachmentFilename={mensagem.attachment_filename}
                                searchTerm=""
                                isHighlighted={highlightedMessageId === mensagem.id}
                                readAt={mensagem.read_at}
                                deliveredAt={mensagem.delivered_at}
                                showSenderName={showSenderName}
                                senderName={
                                  mensagem.remetente_tipo === 'cliente' 
                                    ? selectedAtendimento?.clientes?.push_name || selectedAtendimento?.clientes?.nome || 'Cliente'
                                    : mensagem.remetente_tipo === 'ia' ? 'IA' 
                                    : vendedorNome
                                }
                                status={mensagem.status}
                              />
                            );
                          })}
                          
                          {isClientTyping && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 max-w-[80px]">
                              <span className="flex gap-1">
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </div>
                          )}
                          
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Input Area */}
                {selectedAtendimentoId && (
                  <div className="shrink-0 border-t border-border/20 bg-background/95 backdrop-blur-sm">
                    {isWindowClosed ? (
                      <WhatsAppWindowAlert 
                        lastClientMessageAt={lastClientMessageAt}
                        hoursSinceLast={hoursSinceLast}
                      />
                    ) : (
                      <div className="p-2">
                        {selectedFile && (
                          <div className="mb-3 p-3 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              {selectedFile.type.startsWith('image/') ? (
                                <ImageIcon className="h-5 w-5 text-accent shrink-0" />
                              ) : (
                                <File className="h-5 w-5 text-accent shrink-0" />
                              )}
                              <span className="text-sm font-medium truncate max-w-[200px]">
                                {selectedFile.name}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex gap-2 items-center bg-card/60 backdrop-blur-sm px-2 py-1.5 rounded-2xl shadow-lg border border-border/50">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-all duration-300 hover:scale-105 shrink-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isSending}
                          >
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Textarea
                            ref={messageInputRef}
                            value={messageInput}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            placeholder="Digite sua mensagem..."
                            className="min-h-[32px] max-h-[60px] resize-none flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 py-1"
                            disabled={isSending || isUploading}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleGenerateSuggestion}
                            disabled={isGeneratingSuggestion || isSending || isUploading || messages.length === 0}
                            className="h-10 w-10 rounded-xl hover:bg-purple-500/10 transition-all duration-300 hover:scale-105 shrink-0 group"
                            title="Gerar sugestão de resposta com IA"
                          >
                            {isGeneratingSuggestion ? (
                              <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-purple-500 group-hover:text-purple-600 transition-colors" />
                            )}
                          </Button>
                          <Button
                            onClick={selectedFile ? handleSendWithFile : handleSendMessage}
                            disabled={(!messageInput.trim() && !selectedFile) || isSending || isUploading}
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 shrink-0 disabled:opacity-50 disabled:hover:scale-100"
                          >
                            {(isSending || isUploading) ? (
                              <Loader2 className="h-4 w-4 animate-spin text-white" />
                            ) : (
                              <Send className="h-4 w-4 text-white" />
                            )}
                          </Button>
                          <AudioRecorder 
                            onAudioRecorded={handleAudioRecorded}
                            disabled={isSending || isUploading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Contact Dialog */}
      {deletingContactInfo && (
        <DeleteContactDialog
          open={!!deletingContactInfo}
          onOpenChange={(open) => !open && setDeletingContactInfo(null)}
          clienteId={deletingContactInfo.clienteId}
          clienteNome={deletingContactInfo.clienteNome}
          onSuccess={() => {
            setSelectedAtendimentoId(null);
            setDeletingContactInfo(null);
            if (evolutionInstance) {
              fetchAtendimentos(evolutionInstance);
            }
          }}
        />
      )}
    </>
  );
}
