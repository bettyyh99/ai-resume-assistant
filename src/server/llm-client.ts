import 'server-only';
import {
  Config,
  HeaderUtils,
  LLMClient,
  type Message,
} from 'coze-coding-dev-sdk';
import type { NextRequest } from 'next/server';

/** 结构化抽取 / JSON 任务使用，兼顾质量与速度 */
export const DEFAULT_MODEL = 'doubao-seed-2-0-lite-260215';

/**
 * 创建带请求上下文透传的 LLM 客户端。
 * 必须在服务端（API Route / Server Action）中调用。
 */
export function createLLMClient(req?: NextRequest): LLMClient {
  const config = new Config();
  const customHeaders = req
    ? HeaderUtils.extractForwardHeaders(req.headers)
    : undefined;
  return new LLMClient(config, customHeaders);
}

/** 流式收集模型输出，逐块回调 */
export async function* streamLLM(
  client: LLMClient,
  messages: Message[],
  options?: { model?: string; temperature?: number; thinking?: 'enabled' | 'disabled' },
): AsyncGenerator<string> {
  const stream = client.stream(
    messages,
    {
      model: options?.model ?? DEFAULT_MODEL,
      temperature: options?.temperature ?? 0.7,
      thinking: options?.thinking ?? 'disabled',
    },
  );
  for await (const chunk of stream) {
    if (chunk.content) {
      yield chunk.content.toString();
    }
  }
}

/** 非流式调用，返回完整文本 */
export async function invokeLLM(
  client: LLMClient,
  messages: Message[],
  options?: { model?: string; temperature?: number; thinking?: 'enabled' | 'disabled' },
): Promise<string> {
  const response = await client.invoke(messages, {
    model: options?.model ?? DEFAULT_MODEL,
    temperature: options?.temperature ?? 0.3,
    thinking: options?.thinking ?? 'disabled',
  });
  return response.content;
}

/** SSE 事件 */
export type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; content: string }
  | { type: 'data'; payload: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** 统一构造 SSE ReadableStream 响应 */
export function sseResponse(
  generator: (send: (event: SSEEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: SSEEvent) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };
      try {
        await generator(send);
        send({ type: 'done' });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '生成服务异常，请稍后重试';
        send({ type: 'error', message });
      } finally {
        if (!closed) {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** 从模型可能包裹 ```json 的输出中提取 JSON 字符串 */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return candidate.trim();
}
