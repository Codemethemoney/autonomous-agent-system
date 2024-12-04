import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface ChatRequest {
  model: string
  prompt: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
}

const OLLAMA_HOST = Deno.env.get('OLLAMA_HOST') || 'http://host.docker.internal:11434'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { model, prompt } = await req.json() as ChatRequest

    console.log(`Attempting to connect to Ollama at: ${OLLAMA_HOST}`)
    
    // Call Ollama instance
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify({ response: data.response }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      },
    )
  } catch (error) {
    console.error('Error in chat-with-ollama:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        note: 'Make sure Ollama is running and accessible'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      }
    )
  }
})
