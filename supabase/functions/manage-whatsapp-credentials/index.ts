import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, credentials } = await req.json();
    console.log('Action:', action);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'save_meta_credentials') {
      // Save Meta Cloud API credentials to Supabase Vault
      const { accessToken, phoneNumberId, businessAccountId, webhookToken } = credentials;

      if (!accessToken || !phoneNumberId) {
        return new Response(
          JSON.stringify({ success: false, message: 'Access Token e Phone Number ID são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Store credentials in vault secrets
      const secretsToUpdate = [
        { name: 'WHATSAPP_ACCESS_TOKEN', value: accessToken },
        { name: 'WHATSAPP_PHONE_NUMBER_ID', value: phoneNumberId },
      ];

      if (businessAccountId) {
        secretsToUpdate.push({ name: 'WHATSAPP_BUSINESS_ACCOUNT_ID', value: businessAccountId });
      }
      if (webhookToken) {
        secretsToUpdate.push({ name: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', value: webhookToken });
      }

      // Note: In production, you'd use Supabase Vault API or management API
      // For now, we'll just validate and confirm the credentials work
      
      // Test the credentials
      const testResponse = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        console.error('Meta API validation error:', errorData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Credenciais inválidas: ${errorData.error?.message || 'Erro desconhecido'}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const phoneData = await testResponse.json();
      console.log('Meta API credentials validated:', phoneData.display_phone_number);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Credenciais validadas com sucesso. Atualize os secrets no painel do Supabase.',
          phoneNumber: phoneData.display_phone_number,
          verifiedName: phoneData.verified_name,
          secretsToUpdate: secretsToUpdate.map(s => s.name),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save_evolution_credentials') {
      const { apiUrl, apiKey } = credentials;

      if (!apiUrl || !apiKey) {
        return new Response(
          JSON.stringify({ success: false, message: 'URL e API Key são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Test Evolution API connection
      const testResponse = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Evolution API validation error:', errorText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro ao conectar com Evolution API: ${testResponse.status}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const instances = await testResponse.json();
      console.log('Evolution API connected, instances found:', instances.length || 0);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conexão com Evolution API validada com sucesso',
          instancesCount: Array.isArray(instances) ? instances.length : 0,
          secretsToUpdate: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Ação não reconhecida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    console.error('Error managing credentials:', error);
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
