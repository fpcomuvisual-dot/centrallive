// tests/services/evolution.test.js
// CONTRATO do src/services/evolution.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Cliente da Evolution API (WhatsApp). Envs:
//   VITE_EVOLUTION_URL       (ex: http://localhost:8080)
//   VITE_EVOLUTION_APIKEY
//   VITE_EVOLUTION_INSTANCE  (ex: vivi)
// Assinaturas (export nomeado `evolution` + classe `EvolutionOfflineError`):
//   evolution.enviarTexto(numero, texto)          → { ok, status, data }
//   evolution.enviarImagem(numero, url, caption)  → { ok, status, data }
// Rotas Evolution:
//   POST {URL}/message/sendText/{INSTANCE}
//     headers: { apikey: APIKEY }
//     body: { number, text }
//   POST {URL}/message/sendMedia/{INSTANCE}
//     headers: { apikey: APIKEY }
//     body: { number, mediatype: "image", media: url, caption }
// Falha de rede/timeout (5s) → lança EvolutionOfflineError.
// Status HTTP de erro (4xx/5xx) NÃO é exceção: { ok:false, status, data }.

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const EVO = 'http://evo.test:8080';
vi.stubEnv('VITE_EVOLUTION_URL', EVO);
vi.stubEnv('VITE_EVOLUTION_APIKEY', 'chave-secreta');
vi.stubEnv('VITE_EVOLUTION_INSTANCE', 'vivi');

const captured = { last: null };

const handlers = [
  http.post(`${EVO}/message/sendText/:instance`, async ({ request, params }) => {
    captured.last = { request, params, body: await request.json() };
    return HttpResponse.json({ key: { id: 'msg-1' }, status: 'PENDING' }, { status: 201 });
  }),
  http.post(`${EVO}/message/sendMedia/:instance`, async ({ request, params }) => {
    captured.last = { request, params, body: await request.json() };
    return HttpResponse.json({ key: { id: 'msg-2' }, status: 'PENDING' }, { status: 201 });
  }),
];

const server = setupServer(...handlers);
const { evolution, EvolutionOfflineError } = await import('../../src/services/evolution.js');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('evolution.enviarTexto', () => {
  it('POST na rota certa com instance, apikey e body {number, text}', async () => {
    const r = await evolution.enviarTexto('5518999990001', 'Oi amigaaa');
    expect(r.ok).toBe(true);
    expect(captured.last.params.instance).toBe('vivi');
    expect(captured.last.request.headers.get('apikey')).toBe('chave-secreta');
    expect(captured.last.body).toEqual({ number: '5518999990001', text: 'Oi amigaaa' });
  });
});

describe('evolution.enviarImagem', () => {
  it('POST sendMedia com mediatype image, media e caption', async () => {
    const r = await evolution.enviarImagem(
      '5518999990001',
      'https://fake/anel.jpg',
      'ANEL FLOR — R$ 89,90'
    );
    expect(r.ok).toBe(true);
    expect(captured.last.body).toEqual({
      number: '5518999990001',
      mediatype: 'image',
      media: 'https://fake/anel.jpg',
      caption: 'ANEL FLOR — R$ 89,90',
    });
  });
});

describe('evolution — erros', () => {
  it('HTTP 400 retorna ok:false sem lançar', async () => {
    server.use(
      http.post(`${EVO}/message/sendText/:instance`, () =>
        HttpResponse.json({ error: 'invalid number' }, { status: 400 })
      )
    );
    const r = await evolution.enviarTexto('numero-invalido', 'oi');
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });

  it('falha de rede lança EvolutionOfflineError', async () => {
    server.use(
      http.post(`${EVO}/message/sendText/:instance`, () => HttpResponse.error())
    );
    await expect(evolution.enviarTexto('5518999990001', 'oi')).rejects.toBeInstanceOf(
      EvolutionOfflineError
    );
  });
});
