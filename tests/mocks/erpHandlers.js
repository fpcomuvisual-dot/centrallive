// tests/mocks/erpHandlers.js
// Handlers MSW que simulam o ERP Trio Gestão.
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
import { http, HttpResponse, delay } from 'msw';

export const ERP_BASE = 'http://erp.test:8000/api/v1';

// Banco de dados fake do ERP
export const erpDb = {
  produtos: [
    { codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR ROSA RODIO', preco_venda: 89.9, estoque: 3 },
    { codigo_fabrica: 'AN-1959', descricao: 'ANEL PEDRA REDONDA 6.0 APPLE GREEN', preco_venda: 99.9, estoque: 3 },
    { codigo_fabrica: 'BR-2100', descricao: 'BR PIERCING PEDRA MENOR AZUL MARINHO', preco_venda: 39.9, estoque: 0 },
  ],
};

// Captura do último request (pra inspecionar headers nos testes)
export const captured = { lastRequest: null };

export const handlers = [
  http.get(`${ERP_BASE}/produtos/busca`, ({ request }) => {
    captured.lastRequest = request;
    const url = new URL(request.url);
    const termo = (url.searchParams.get('termo') || '').toLowerCase();
    const resultados = erpDb.produtos.filter(
      (p) =>
        p.codigo_fabrica.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo)
    );
    return HttpResponse.json({ resultados });
  }),

  http.post(`${ERP_BASE}/lives`, async ({ request }) => {
    captured.lastRequest = request;
    const body = await request.json();
    return HttpResponse.json({ id: 'live-001', ...body }, { status: 201 });
  }),

  http.post(`${ERP_BASE}/lives/:liveId/reservas`, async ({ request, params }) => {
    captured.lastRequest = request;
    const body = await request.json();
    // SKU esgotado devolve 409 — a feature principal
    if (body.codigo_fabrica === 'BR-2100') {
      return HttpResponse.json(
        { erro: 'estoque_esgotado', codigo_fabrica: 'BR-2100' },
        { status: 409 }
      );
    }
    return HttpResponse.json(
      { id: 'res-123', live_id: params.liveId, ...body, expira_em: '2026-07-03T12:00:00Z' },
      { status: 201 }
    );
  }),

  http.delete(`${ERP_BASE}/lives/reservas/:reservaId`, ({ request }) => {
    captured.lastRequest = request;
    return HttpResponse.json({ ok: true });
  }),

  http.post(`${ERP_BASE}/lives/reservas/:reservaId/confirmar`, ({ request, params }) => {
    captured.lastRequest = request;
    return HttpResponse.json({ id: params.reservaId, status: 'confirmada' });
  }),

  http.get(`${ERP_BASE}/lives/:liveId/catalogo`, ({ request }) => {
    captured.lastRequest = request;
    return HttpResponse.json({
      itens: erpDb.produtos.map((p) => ({
        codigo_fabrica: p.codigo_fabrica,
        descricao: p.descricao,
        preco_venda: p.preco_venda,
        estoque_disponivel: p.estoque,
      })),
    });
  }),
];

// Handler de rede caída — usado em testes de resiliência
export const networkFailureHandlers = [
  http.get(`${ERP_BASE}/produtos/busca`, () => HttpResponse.error()),
  http.get(`${ERP_BASE}/lives/:liveId/catalogo`, () => HttpResponse.error()),
];

// Handler de resposta lenta (timeout) — o service deve abortar em 5s
export const slowHandlers = [
  http.get(`${ERP_BASE}/produtos/busca`, async () => {
    await delay(10_000);
    return HttpResponse.json({ resultados: [] });
  }),
];
