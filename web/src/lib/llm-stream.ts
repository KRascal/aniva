/**
 * LLM Streaming — SSE対応のストリーミングLLM呼び出し
 * xAI (grok) / Anthropic 両対応
 */

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * ストリーミングでLLM応答を生成し、ReadableStreamを返す
 */
export async function callLLMStream(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  options?: { isFcMember?: boolean },
): Promise<ReadableStream<Uint8Array>> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const isFc = options?.isFcMember ?? false;
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let fullText = '';

        // FC会員 → Anthropic claude-sonnet-4-6 ストリーミング
        if (isFc && anthropicKey) {
          try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic({ apiKey: anthropicKey });
            const stream = client.messages.stream({
              model: process.env.LLM_MODEL_FC || 'claude-sonnet-4-6',
              max_tokens: 600,
              system: systemPrompt,
              messages,
            });

            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const token = event.delta.text;
                fullText += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`));
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`));
            controller.close();
            return;
          } catch (e) {
            console.error('[llm-stream] Anthropic FC stream failed, falling back:', e);
          }
        }

        // 通常 → xAI (grok) ストリーミング（OpenAI互換）
        if (xaiKey) {
          try {
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${xaiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: process.env.LLM_MODEL || 'grok-4-1-fast-non-reasoning',
                messages: [{ role: 'system', content: systemPrompt }, ...messages],
                max_tokens: 500,
                temperature: 0.85,
                stream: true,
              }),
            });

            if (!res.ok || !res.body) {
              throw new Error(`xAI stream error: ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const token = parsed.choices?.[0]?.delta?.content;
                  if (token) {
                    fullText += token;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`));
                  }
                } catch {
                  // malformed JSON chunk, skip
                }
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`));
            controller.close();
            return;
          } catch (e) {
            console.error('[llm-stream] xAI stream failed, falling back:', e);
          }
        }

        // Fallback → Anthropic haiku ストリーミング
        if (anthropicKey) {
          const Anthropic = (await import('@anthropic-ai/sdk')).default;
          const client = new Anthropic({ apiKey: anthropicKey });
          const stream = client.messages.stream({
            model: 'claude-haiku-4-5',
            max_tokens: 500,
            system: systemPrompt,
            messages,
          });

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const token = event.delta.text;
              fullText += token;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', token })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'No LLM API key' })}\n\n`));
        controller.close();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`));
        controller.close();
      }
    },
  });
}
