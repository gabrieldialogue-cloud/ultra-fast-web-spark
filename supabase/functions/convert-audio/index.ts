import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webmUrl, atendimentoId } = await req.json();

    if (!webmUrl || !atendimentoId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: webmUrl and atendimentoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Converting audio from WebM to OGG/Opus:', webmUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download WebM file
    const webmResponse = await fetch(webmUrl);
    if (!webmResponse.ok) {
      throw new Error(`Failed to download WebM file: ${webmResponse.statusText}`);
    }

    const webmData = await webmResponse.arrayBuffer();
    console.log('Downloaded WebM file, size:', webmData.byteLength, 'bytes');

    // Save WebM to temporary file
    const webmPath = await Deno.makeTempFile({ suffix: '.webm' });
    await Deno.writeFile(webmPath, new Uint8Array(webmData));

    // Convert to OGG using FFmpeg
    const oggPath = await Deno.makeTempFile({ suffix: '.ogg' });
    
    const ffmpegCommand = new Deno.Command('ffmpeg', {
      args: [
        '-i', webmPath,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '32k',
        '-f', 'ogg',
        '-y',
        oggPath
      ],
      stdout: 'piped',
      stderr: 'piped',
    });

    const ffmpegProcess = await ffmpegCommand.output();
    
    if (!ffmpegProcess.success) {
      const errorText = new TextDecoder().decode(ffmpegProcess.stderr);
      console.error('FFmpeg error:', errorText);
      throw new Error('Audio conversion failed');
    }

    console.log('Conversion completed successfully');

    // Read converted OGG file
    const oggData = await Deno.readFile(oggPath);
    console.log('Converted OGG file size:', oggData.byteLength, 'bytes');

    // Upload OGG to Supabase Storage
    const fileName = `${Date.now()}-audio.ogg`;
    const filePath = `${atendimentoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-audios')
      .upload(filePath, oggData, {
        contentType: 'audio/ogg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-audios')
      .getPublicUrl(filePath);

    console.log('OGG file uploaded successfully:', publicUrl);

    // Cleanup temporary files
    try {
      await Deno.remove(webmPath);
      await Deno.remove(oggPath);
    } catch (e) {
      console.error('Failed to cleanup temp files:', e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        oggUrl: publicUrl,
        originalSize: webmData.byteLength,
        convertedSize: oggData.byteLength 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in convert-audio function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
