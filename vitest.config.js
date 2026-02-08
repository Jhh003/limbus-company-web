import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        JWT_SECRET: 'test-secret',
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret'
      },
      kvNamespaces: ['CAPTCHA_KV'],
      d1Databases: ['DB'],
      r2Buckets: ['IMAGES_BUCKET']
    }
  }
});
