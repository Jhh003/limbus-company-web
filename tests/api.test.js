import { describe, it, expect, vi } from 'vitest';
import { onRequest } from '../functions/api/[[path]].js';

// Mock crypto if not available (Node < 19)
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

describe('API Endpoints', () => {
  const mockEnv = {
    JWT_SECRET: 'test-secret',
    TURNSTILE_SECRET_KEY: 'test-key',
    ALLOWED_ORIGIN: '*',
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn(),
          all: vi.fn(),
          run: vi.fn(() => ({ meta: { last_row_id: 1 } }))
        }))
      }))
    },
    CAPTCHA_KV: {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  };

  it('GET /api/health returns 200', async () => {
    const request = new Request('http://localhost/api/health');
    const response = await onRequest({ request, env: mockEnv, params: {} });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('运行正常');
  });

  it('POST /api/auth/login fails without turnstile', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    const response = await onRequest({ request, env: mockEnv, params: {} });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('请完成人机验证');
  });
});
