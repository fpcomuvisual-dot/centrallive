const BASE = import.meta.env.VITE_EVOLUTION_URL;
const APIKEY = import.meta.env.VITE_EVOLUTION_APIKEY;
const INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE;
const TIMEOUT_MS = 5_000;

export class EvolutionOfflineError extends Error {
  constructor(cause) {
    super('Evolution offline ou inacessível');
    this.name = 'EvolutionOfflineError';
    this.cause = cause;
  }
}

async function request(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: APIKEY,
      },
      body: JSON.stringify(body),
    });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json();
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    throw new EvolutionOfflineError(err);
  } finally {
    clearTimeout(timer);
  }
}

async function requestGet(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: APIKEY,
      },
    });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json();
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    throw new EvolutionOfflineError(err);
  } finally {
    clearTimeout(timer);
  }
}

export const evolution = {
  enviarTexto: (numero, texto) =>
    request(`/message/sendText/${INSTANCE}`, { number: numero, text: texto }),

  enviarImagem: (numero, url, caption) =>
    request(`/message/sendMedia/${INSTANCE}`, {
      number: numero,
      mediatype: 'image',
      media: url,
      caption,
    }),

  verificarConexao: () =>
    requestGet(`/instance/connectionState/${INSTANCE}`),

  obterQrCode: () =>
    requestGet(`/instance/connect/${INSTANCE}`),
};
