const BASE = import.meta.env.VITE_ERP_BASE_URL;
const TIMEOUT_MS = 5_000;

export class ClientesOfflineError extends Error {
  constructor(cause) {
    super('Serviço de clientes offline ou inacessível');
    this.name = 'ClientesOfflineError';
    this.cause = cause;
  }
}

async function request(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = {};
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
    
    if (!res.ok) {
        const error = new Error(data?.detail || 'Erro na API');
        error.status = res.status;
        throw error;
    }

    return data;
  } catch (err) {
    if (err.status) {
        throw err;
    }
    throw new ClientesOfflineError(err);
  } finally {
    clearTimeout(timer);
  }
}

export const clientesService = {
  criar: (payload) => request('POST', '/clientes', payload),
  buscar: async (termo) => {
    const data = await request('GET', `/clientes/busca?termo=${encodeURIComponent(termo)}`);
    return data.resultados;
  },
  listar: async () => {
    const data = await request('GET', '/clientes');
    return data.clientes;
  },
  buscarPorId: async (id) => {
    const data = await request('GET', `/clientes/${id}`);
    return data;
  },
  atualizar: async (id, payload) => {
    const data = await request('PUT', `/clientes/${id}`, payload);
    return data;
  },
  listarVendas: async (id) => {
    const data = await request('GET', `/clientes/${id}/vendas`);
    return data.vendas || data || [];
  },
};
