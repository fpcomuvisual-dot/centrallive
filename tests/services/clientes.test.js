// tests/services/clientes.test.js
// CONTRATO do src/services/clientes.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// ESTE ARQUIVO SUBSTITUI POR COMPLETO o antigo tests/services/clientes.test.js
// (aquele testava localStorage; agora o service fala com o ERP de verdade,
// via as rotas GLOBAIS /api/v1/clientes — sem x-company, conforme
// T-ERP-CLIENTES-001). APAGUE o arquivo antigo antes de aplicar este.
//
// Interface MANTIDA igual (mesmos nomes, mesma forma de uso) — só a
// implementação por dentro muda de localStorage pra fetch. Os métodos
// agora são ASSÍNCRONOS (retornam Promise). Isso é INTENCIONAL: qualquer
// tela que já mockava clientesService com valores síncronos continua
// funcionando, porque `await valorNaoPromise` resolve normalmente — mas
// a implementação real precisa aguardar a resposta HTTP de verdade.
//
// Base URL: mesma env já usada pelo erp.js → import.meta.env.VITE_ERP_BASE_URL
// Rotas consumidas (globais, SEM header x-company):
//   POST /clientes                  → clientesService.criar
//   GET  /clientes/busca?termo=     → clientesService.buscar
//   GET  /clientes                  → clientesService.listar
//
// Assinaturas (export nomeado `clientesService`):
//   criar({ nome, whatsapp, instagram?, endereco? }) → Promise<cliente>
//     Se o ERP responder 409 (whatsapp duplicado): rejeita com um erro
//     cuja .status === 409 (não é ErpOfflineError — é conflito de negócio)
//   buscar(termo) → Promise<Array<cliente>>
//   listar()      → Promise<Array<cliente>>
//   Falha de rede/timeout (mesmo padrão do erp.js) → lança ClientesOfflineError

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const ERP_BASE = 'http://erp.test:8000/api/v1';
vi.stubEnv('VITE_ERP_BASE_URL', ERP_BASE);

const captured = { last: null };

const handlers = [
  http.post(`${ERP_BASE}/clientes`, async ({ request }) => {
    captured.last = request;
    const body = await request.json();
    if (body.whatsapp === '5518999990001') {
      return HttpResponse.json({ detail: 'whatsapp duplicado' }, { status: 409 });
    }
    return HttpResponse.json(
      { id: 99, nome: body.nome, whatsapp: body.whatsapp.replace(/\D/g, ''), instagram: body.instagram || '', endereco: body.endereco || '' },
      { status: 201 }
    );
  }),
  http.get(`${ERP_BASE}/clientes/busca`, ({ request }) => {
    captured.last = request;
    const url = new URL(request.url);
    const termo = url.searchParams.get('termo') || '';
    if (termo.toLowerCase().includes('maria')) {
      return HttpResponse.json({
        resultados: [{ id: 1, nome: 'Maria Silva', whatsapp: '5518999990001', instagram: '', endereco: '' }],
      });
    }
    return HttpResponse.json({ resultados: [] });
  }),
  http.get(`${ERP_BASE}/clientes`, ({ request }) => {
    captured.last = request;
    return HttpResponse.json({
      clientes: [
        { id: 1, nome: 'Maria Silva', whatsapp: '5518999990001', instagram: '', endereco: '' },
        { id: 2, nome: 'Ana Claudia', whatsapp: '15127690586', instagram: '', endereco: '' },
      ],
    });
  }),
];

const server = setupServer(...handlers);
const { clientesService, ClientesOfflineError } = await import('../../src/services/clientes.js');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('clientesService.criar', () => {
  it('cria cliente via POST /clientes e devolve o registro do ERP', async () => {
    const c = await clientesService.criar({ nome: 'Cintia Nascimento', whatsapp: '5518988887777' });
    expect(c.id).toBe(99);
    expect(c.nome).toBe('Cintia Nascimento');
    expect(c.whatsapp).toBe('5518988887777');
  });

  it('NÃO manda header x-company (rota global)', async () => {
    await clientesService.criar({ nome: 'X', whatsapp: '5518900000001' });
    expect(captured.last.headers.get('x-company')).toBeNull();
  });

  it('whatsapp duplicado rejeita com status 409 (não é ErpOfflineError)', async () => {
    await expect(
      clientesService.criar({ nome: 'Duplicada', whatsapp: '5518999990001' })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('clientesService.buscar', () => {
  it('busca via GET /clientes/busca?termo= e devolve o array de resultados', async () => {
    const r = await clientesService.buscar('maria');
    expect(r).toHaveLength(1);
    expect(r[0].nome).toBe('Maria Silva');
  });

  it('sem match devolve array vazio', async () => {
    const r = await clientesService.buscar('ninguem-com-esse-nome');
    expect(r).toEqual([]);
  });
});

describe('clientesService.listar', () => {
  it('lista via GET /clientes e devolve o array completo', async () => {
    const r = await clientesService.listar();
    expect(r).toHaveLength(2);
    expect(r.map((c) => c.nome)).toContain('Ana Claudia');
  });
});

describe('clientesService — resiliência', () => {
  it('rede caída lança ClientesOfflineError', async () => {
    server.use(http.get(`${ERP_BASE}/clientes`, () => HttpResponse.error()));
    await expect(clientesService.listar()).rejects.toBeInstanceOf(ClientesOfflineError);
  });
});
