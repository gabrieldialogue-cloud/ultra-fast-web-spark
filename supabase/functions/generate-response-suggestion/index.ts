import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientMessage, conversationContext } = await req.json();

    console.log('🔍 Requisição recebida:', { 
      clientMessage, 
      contextLength: conversationContext?.length || 0 
    });

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const messages = [
      { 
        role: 'system', 
        content: 'Você é um assistente de vendas de autopeças brasileiro. Gere respostas CURTAS (máximo 2-3 frases), profissionais e amigáveis em português do Brasil. Seja direto e objetivo.' 
      },
      ...(conversationContext || []),
      { 
        role: 'user', 
        content: `Cliente disse: "${clientMessage}"\n\nGere UMA resposta CURTA e apropriada para o vendedor enviar ao cliente.` 
      }
    ];

    console.log('📤 Enviando para OpenAI:', {
      model: 'gpt-4o-mini',
      messageCount: messages.length
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Resposta da OpenAI:', JSON.stringify(data, null, 2));

    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    const suggestedResponse = data.choices[0].message?.content?.trim();

    if (!suggestedResponse) {
      console.error('⚠️ Conteúdo vazio na resposta:', data);
      throw new Error('Resposta da IA está vazia');
    }

    console.log('✅ Sugestão gerada:', suggestedResponse);

    return new Response(JSON.stringify({ suggestedResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Erro em generate-response-suggestion:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error instanceof Error ? error.stack : undefined 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
