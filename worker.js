// Cloudflare Worker pour gérer les images et le streaming
export default {
  async fetch(request, env) {
    // Gérer les requêtes CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    try {
      const { messages, instruction } = await request.json();
      const systemPrompt = instruction || "Tu es Litual AI, une IA utile.";

      // Formater les messages pour supporter les images
      const formattedMessages = messages.map(msg => {
        if (msg.role === "user" && Array.isArray(msg.content)) {
          // Le message est un tableau avec du texte et/ou des images
          return {
            role: msg.role,
            content: msg.content.map(part => {
              if (part.type === "image_url" && part.image_url?.url) {
                // Convertir base64 en URL directement (Llama 3.2 Vision l'accepte)
                return {
                  type: "image_url",
                  image_url: {
                    url: part.image_url.url
                  }
                };
              } else if (part.type === "text") {
                return part;
              }
              return part;
            })
          };
        }
        // Message sans images (assistant ou user simple)
        return {
          role: msg.role,
          content: typeof msg.content === 'string' 
            ? msg.content 
            : (Array.isArray(msg.content) 
              ? msg.content.filter(p => p.type === "text").map(p => p.text || p.content).join(" ")
              : msg.content)
        };
      });

      // Utiliser Llama 3.2 Vision qui gère texte ET images
      const response = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages
        ],
        max_tokens: 1500,
        stream: true
      });

      // Retourner le streaming en server-sent-events
      return new Response(response, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      console.error("Worker error:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
