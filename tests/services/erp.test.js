// tests/services/erp.test.js
// CONTRATO do src/services/erp.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// O programador implementa src/services/erp.js até esta suíte passar.
// Assinaturas exigidas (export nomeado `erp` + classe `ErpOfflineError`):
//   erp.buscarProdutos(termo)                → { ok, status, data }
//   erp.criarLive(payload)                   → { ok, status, data }
//   erp.adicionarItemLive(liveId, payload)   → { ok, status, data }
//   erp.catalogoLive(liveId)                 → { ok, status, data }
//   erp.criarReserva(liveId, payload)        → { ok, status, data }
//   erp.removerReserva(reservaId)            → { ok, status, data }
//   erp.confirmarReserva(reservaId)          → { ok, status, data }
// Regras:
//   - Toda chamada leva header 'x-company: vivi'
//   - Base URL vem de import.meta.env.VITE_ERP_BASE_URL
//   - 409 NÃO é exceção: retorna { ok: false, status: 409, data }
//   - Falha de rede/timeout → lança ErpOfflineError
//   - Timeout: 5s (AbortController)

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import {
  handlers,
  networkFailureHandlers,
  slowHandlers,
  captured,
  ERP_BASE,
} from '../mocks/erpHandlers.js';

// Fixa a env ANTES de importar o service
vi.stubEnv('VITE_ERP_BASE_URL', ERP_BASE);

const { erp, ErpOfflineError } = await import('../../src/services/erp.js');

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('erp.buscarProdutos', () => {
  it('retorna produtos que batem com o termo', async () => {
    const res = await erp.buscarProdutos('anel');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.resultados).toHaveLength(2);
    expect(res.data.resultados[0]).toHaveProperty('codigo_fabrica');
    expect(res.data.resultados[0]).toHaveProperty('preco_venda');
  });

  it('envia o header x-company: vivi', async () => {
    await erp.buscarProdutos('anel');
    expect(captured.lastRequest.headers.get('x-company')).toBe('vivi');
  });

  it('retorna lista vazia sem lançar erro quando nada bate', async () => {
    const res = await erp.buscarProdutos('inexistente-xyz');
    expect(res.ok).toBe(true);
    expect(res.data.resultados).toHaveLength(0);
  });
});

describe('erp.criarReserva — o 409 é resposta, não exceção', () => {
  it('cria reserva com sucesso para SKU disponível', async () => {
    const res = await erp.criarReserva('live-001', {
      codigo_fabrica: 'AN-1664',
      cliente_id: 'cli-1',
      ttl_minutos: 30,
    });
    expect(res.ok).toBe(true);
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data).toHaveProperty('expira_em');
  });

  it('retorna { ok:false, status:409 } quando estoque esgotou — NÃO lança', async () => {
    const res = await erp.criarReserva('live-001', {
      codigo_fabrica: 'BR-2100',
      cliente_id: 'cli-1',
      ttl_minutos: 30,
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(409);
    expect(res.data.erro).toBe('estoque_esgotado');
  });

  it('envia x-company também no POST', async () => {
    await erp.criarReserva('live-001', {
      codigo_fabrica: 'AN-1664',
      cliente_id: 'cli-1',
      ttl_minutos: 30,
    });
    expect(captured.lastRequest.headers.get('x-company')).toBe('vivi');
  });
});

describe('erp.confirmarReserva e removerReserva', () => {
  it('confirmarReserva faz POST no endpoint de confirmação', async () => {
    const res = await erp.confirmarReserva('res-123');
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('confirmada');
    expect(captured.lastRequest.method).toBe('POST');
    expect(captured.lastRequest.url).toContain('/lives/reservas/res-123/confirmar');
  });

  it('removerReserva faz DELETE', async () => {
    const res = await erp.removerReserva('res-123');
    expect(res.ok).toBe(true);
    expect(captured.lastRequest.method).toBe('DELETE');
    expect(captured.lastRequest.url).toContain('/lives/reservas/res-123');
  });
});

describe('erp.catalogoLive', () => {
  it('retorna itens com estoque_disponivel vindo do ERP', async () => {
    const res = await erp.catalogoLive('live-001');
    expect(res.ok).toBe(true);
    const itens = res.data.itens;
    expect(itens.length).toBeGreaterThan(0);
    expect(itens[0]).toHaveProperty('estoque_disponivel');
    expect(itens[0]).toHaveProperty('preco_venda');
  });
});

describe('resiliência — ERP fora do ar', () => {
  it('lança ErpOfflineError em falha de rede', async () => {
    server.use(...networkFailureHandlers);
    await expect(erp.buscarProdutos('anel')).rejects.toBeInstanceOf(ErpOfflineError);
  });

  it('lança ErpOfflineError em timeout (>5s)', async () => {
    server.use(...slowHandlers);
    vi.useFakeTimers();
    const promise = erp.buscarProdutos('anel').catch((e) => e);
    await vi.advanceTimersByTimeAsync(5_100);
    const result = await promise;
    expect(result).toBeInstanceOf(ErpOfflineError);
    vi.useRealTimers();
  }, 15_000);
});
