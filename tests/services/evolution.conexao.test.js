// tests/services/evolution.conexao.test.js
// CONTRATO dos métodos NOVOS de src/services/evolution.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
//   evolution.verificarConexao() → { ok, status, data }
//     GET {URL}/instance/connectionState/{INSTANCE}  (header apikey)
//     data.instance.state === 'open' quando conectado
//   evolution.obterQrCode() → { ok, status, data }
//     GET {URL}/instance/connect/{INSTANCE}          (header apikey)
//     data.base64 traz o QR ("data:image/png;base64,...")
//   Rede caída → EvolutionOfflineError (mesmo padrão dos demais).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const EVO = 'http://evo.test:8080';
vi.stubEnv('VITE_EVOLUTION_URL', EVO);
vi.stubEnv('VITE_EVOLUTION_APIKEY', 'chave-secreta');
vi.stubEnv('VITE_EVOLUTION_INSTANCE', 'vivi');

const captured = { last: null };
const handlers = [
  http.get(`${EVO}/instance/connectionState/:instance`, ({ request, params }) => {
    captured.last = { request, params };
    return HttpResponse.json({ instance: { instanceName: params.instance, state: 'open' } });
  }),
  http.get(`${EVO}/instance/connect/:instance`, ({ request, params }) => {
    captured.last = { request, params };
    return HttpResponse.json({ base64: 'data:image/png;base64,QRFAKE==' });
  }),
];

const server = setupServer(...handlers);
const { evolution, EvolutionOfflineError } = await import('../../src/services/evolution.js');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('evolution.verificarConexao', () => {
  it('GET connectionState da instância com apikey; state open', async () => {
    const r = await evolution.verificarConexao();
    expect(r.ok).toBe(true);
    expect(r.data.instance.state).toBe('open');
    expect(captured.last.params.instance).toBe('vivi');
    expect(captured.last.request.headers.get('apikey')).toBe('chave-secreta');
  });

  it('rede caída lança EvolutionOfflineError', async () => {
    server.use(http.get(`${EVO}/instance/connectionState/:instance`, () => HttpResponse.error()));
    await expect(evolution.verificarConexao()).rejects.toBeInstanceOf(EvolutionOfflineError);
  });
});

describe('evolution.obterQrCode', () => {
  it('GET connect da instância devolve o base64 do QR', async () => {
    const r = await evolution.obterQrCode();
    expect(r.ok).toBe(true);
    expect(r.data.base64).toContain('base64');
    expect(captured.last.params.instance).toBe('vivi');
  });
});
