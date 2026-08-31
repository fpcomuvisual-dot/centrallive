// tests/services/erp.listarProdutos.test.js
// CONTRATO do método NOVO de src/services/erp.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
//   erp.listarProdutos() → { ok, status, data }
//     GET {BASE}/produtos  (header x-company: vivi, mesmo padrão
//     dos demais métodos de erp.js)
//     data.produtos é o array retornado pelo ERP

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const ERP_BASE = 'http://erp.test:8000/api/v1';
vi.stubEnv('VITE_ERP_BASE_URL', ERP_BASE);

const captured = { last: null };
const handlers = [
  http.get(`${ERP_BASE}/produtos`, ({ request }) => {
    captured.last = request;
    return HttpResponse.json({
      produtos: [
        { codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR ROSA', preco_venda: 89.9, estoque: 3 },
        { codigo_fabrica: 'PR-001', descricao: 'PRESILHA BORBOLETA', preco_venda: 22.0, estoque: 8 },
      ],
    });
  }),
];
const server = setupServer(...handlers);
const { erp } = await import('../../src/services/erp.js');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('erp.listarProdutos', () => {
  it('GET /produtos com header x-company, devolve o array', async () => {
    const r = await erp.listarProdutos();
    expect(r.ok).toBe(true);
    expect(r.data.produtos).toHaveLength(2);
    expect(captured.last.headers.get('x-company')).toBe('vivi');
  });
});
