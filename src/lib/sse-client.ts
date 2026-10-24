/** 与服务端 sseResponse 对应的事件结构 */
export type SSEEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; content: string }
  | { type: 'data'; payload: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface StreamHandlers {
  onStatus?: (message: string) => void;
  onDelta?: (content: string) => void;
  onData?: (payload: unknown) => void;
  signal?: AbortSignal;
}

/**
 * 以 fetch + Reader 方式消费 SSE，支持打字机式增量渲染与中断。
 * 返回是否正常结束（收到 done 事件）。
 */
export async function consumeSSE(
  url: string,
  body: unknown,
  handlers: StreamHandlers,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    let detail = `服务异常（${response.status}）`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (errorBody.error) detail = errorBody.error;
    } catch {
      // 忽略 JSON 解析失败
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part
        .split('\n')
        .filter((l) => l.startsWith('data: '))
        .map((l) => l.slice(6))
        .join('');
      if (!line) continue;

      const event = JSON.parse(line) as SSEEvent;
      switch (event.type) {
        case 'status':
          handlers.onStatus?.(event.message);
          break;
        case 'delta':
          handlers.onDelta?.(event.content);
          break;
        case 'data':
          handlers.onData?.(event.payload);
          break;
        case 'error':
          throw new Error(event.message);
        case 'done':
          return;
      }
    }
  }
}
