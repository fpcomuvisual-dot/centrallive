const BASE = import.meta.env.VITE_ERP_BASE_URL;
const TIMEOUT_MS = 5_000;

export class ErpOfflineError extends Error {
  constructor(cause) {
    super('ERP offline ou inacessível');
    this.name = 'ErpOfflineError';
    this.cause = cause;
  }
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { 'x-company': 'vivi' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json();
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    throw new ErpOfflineError(err);
  } finally {
    clearTimeout(timer);
  }
}

export const erp = {
  listarProdutos: () =>
    request('GET', '/produtos'),

  buscarProdutos: (termo) =>
    request('GET', `/produtos/busca?termo=${encodeURIComponent(termo)}`),

  criarLive: (payload) =>
    request('POST', '/lives', payload),

  adicionarItemLive: (liveId, payload) =>
    request('POST', `/lives/${liveId}/itens`, payload),

  catalogoLive: (liveId) =>
    request('GET', `/lives/${liveId}/catalogo`),

  criarReserva: (liveId, payload) =>
    request('POST', `/lives/${liveId}/reservas`, payload),

  removerReserva: (reservaId) =>
    request('DELETE', `/lives/reservas/${reservaId}`),

  confirmarReserva: (reservaId) =>
    request('POST', `/lives/reservas/${reservaId}/confirmar`),

  listarLives: () =>
    request('GET', '/lives'),

  encerrarLive: (liveId) =>
    request('POST', `/lives/${liveId}/encerrar`),

  listarVendasDaLive: (liveId) =>
    request('GET', `/lives/${liveId}/vendas`),

  salvarVenda: (payload) =>
    request('POST', '/vendas', payload),

  listarVariacoes: (codigoFabrica) =>
    request('GET', `/produtos/${codigoFabrica}/variacoes`),

  criarVariacao: (codigoFabrica, body) =>
    request('POST', `/produtos/${codigoFabrica}/variacoes`, body),
};
