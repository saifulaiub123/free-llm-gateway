/**
 * Manual end-to-end smoke test (TASK-065) against a RUNNING gateway. Walks the full operator flow:
 * register → list providers → (optionally add a real key + fetch models) → create an LLM API token →
 * call the OpenAI-compatible `/v1/chat/completions` and print the routing headers (`X-Routed-Via`,
 * `X-Fallback-Attempts`) — exactly the telemetry ScraperQ records.
 *
 * Usage (server must be running, e.g. `pnpm dev`):
 *   BASE_URL=http://localhost:5001 \
 *   REAL_PROVIDER=groq REAL_PROVIDER_KEY=gsk_... \
 *   pnpm --filter server smoke
 *
 * REAL_PROVIDER / REAL_PROVIDER_KEY are optional: without them the script verifies the management
 * flow + token issuance and stops before the chat call (which needs an enabled model).
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5001';
const API = `${BASE_URL}/api/v1`;
const GATEWAY = `${BASE_URL}/v1`;

interface Envelope<T> {
  data: T;
}

async function api<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status}: ${text}`);
  }
  return (JSON.parse(text) as Envelope<T>).data;
}

async function main(): Promise<void> {
  const email = `smoke+${Date.now()}@example.com`;
  const password = 'smoke-password-123';

  const { accessToken } = await api<{ accessToken: string }>('/auth/register', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  console.log(`✓ Registered ${email}`);

  const providers = await api<{ key: string; displayName: string }[]>('/providers', accessToken);
  console.log(`✓ Provider catalog: ${providers.length} providers`);

  const realProvider = process.env.REAL_PROVIDER;
  const realKey = process.env.REAL_PROVIDER_KEY;
  let modelReady = false;
  if (realProvider && realKey) {
    const key = await api<{ id: number }>(`/providers/${realProvider}/keys`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ apiKey: realKey, label: 'smoke' }),
    });
    console.log(`✓ Added ${realProvider} key #${key.id}`);
    const fetched = await api<{ fetched: number; free: number }>(
      `/providers/keys/${key.id}/fetch-models`,
      accessToken,
      { method: 'POST' },
    );
    console.log(`✓ Fetched ${fetched.fetched} models (${fetched.free} free, enabled)`);
    modelReady = fetched.free > 0;
  } else {
    console.log('• Skipping key/model step (set REAL_PROVIDER + REAL_PROVIDER_KEY to exercise chat)');
  }

  const { token, prefix } = await api<{ token: string; prefix: string }>('/tokens', accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'smoke' }),
  });
  console.log(`✓ Created LLM API token (${prefix}…)`);

  if (!modelReady) {
    console.log('✓ Management flow OK. Provide a real key to run the /v1 chat call.');
    return;
  }

  const response = await fetch(`${GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ model: 'auto', messages: [{ role: 'user', content: 'Say hi in 3 words.' }] }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Gateway chat → ${response.status}: ${body}`);
  }
  console.log(`✓ Chat OK — X-Routed-Via: ${response.headers.get('x-routed-via')}`);
  console.log(`  X-Fallback-Attempts: ${response.headers.get('x-fallback-attempts') ?? '0'}`);
  console.log('✅ Smoke test passed.');
}

main().catch((error: unknown) => {
  console.error('❌ Smoke test failed:', error);
  process.exit(1);
});
