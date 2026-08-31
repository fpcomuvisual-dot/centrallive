// tests/services/artes.test.js
// CONTRATO do src/services/artes.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// artesService encapsula TODO acesso ao Firestore (coleção 'sessoes').
// Nenhuma tela importa firebase/firestore direto — só este service.
// Assinaturas exigidas (export nomeado `artesService`):
//   artesService.listarSessoes()
//     → Promise<Array<{ id, nome, created_at, total_artes, artes: [...] }>>
//     Ordenado por created_at DESC (mais recente primeiro).
//   artesService.vincularSku(sessaoId, arteIndex, sku)
//     → Promise<void>
//     Atualiza artes[arteIndex].sku no documento, preservando as
//     demais artes e campos do array intactos.
//
// firebase/firestore é dependência EXTERNA — mockada aqui (permitido).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock do SDK do Firestore ---
const fakeDocs = [
  {
    id: 'sessao-B',
    data: () => ({
      nome: 'lote-2506-1010',
      vendedora: 'vivi',
      created_at: { seconds: 2000 },
      total_artes: 1,
      artes: [
        { nome: 'Colar Riviera', preco: 'R$ 23,50', parcelas: '10x R$ 2,35', storage_url: 'https://fake/colar.jpg' },
      ],
    }),
  },
  {
    id: 'sessao-A',
    data: () => ({
      nome: 'lote-2406-0920',
      vendedora: 'vivi',
      created_at: { seconds: 1000 },
      total_artes: 2,
      artes: [
        { nome: 'Anel Fileira', preco: 'R$ 10,00', parcelas: '10x R$ 1,00', storage_url: 'https://fake/anel.jpg', sku: 'AN-1664' },
        { nome: 'Brinco Argola', preco: 'R$ 69,90', parcelas: '3x R$ 23,30', storage_url: 'https://fake/brinco.jpg' },
      ],
    }),
  },
];

const getDocs = vi.fn(async () => ({ docs: fakeDocs }));
const getDoc = vi.fn(async () => ({
  exists: () => true,
  data: () => fakeDocs[1].data(),
}));
const updateDoc = vi.fn(async () => {});
const collection = vi.fn(() => ({ __collection: 'sessoes' }));
const doc = vi.fn(() => ({ __doc: true }));
const query = vi.fn((...args) => ({ __query: args }));
const orderBy = vi.fn((field, dir) => ({ __orderBy: [field, dir] }));

vi.mock('firebase/firestore', () => ({
  getDocs, getDoc, updateDoc, collection, doc, query, orderBy,
}));
vi.mock('../../src/services/firebase.js', () => ({
  db: { __db: true },
  storage: { __storage: true },
}));

const { artesService } = await import('../../src/services/artes.js');

beforeEach(() => {
  getDocs.mockClear();
  getDoc.mockClear();
  updateDoc.mockClear();
});

describe('artesService.listarSessoes', () => {
  it('retorna as sessões com id + campos do documento', async () => {
    const sessoes = await artesService.listarSessoes();
    expect(sessoes).toHaveLength(2);
    const ids = sessoes.map((s) => s.id);
    expect(ids).toContain('sessao-A');
    expect(ids).toContain('sessao-B');
    const a = sessoes.find((s) => s.id === 'sessao-A');
    expect(a.nome).toBe('lote-2406-0920');
    expect(a.artes).toHaveLength(2);
  });

  it('consulta a coleção "sessoes" ordenada por created_at desc', async () => {
    await artesService.listarSessoes();
    expect(collection).toHaveBeenCalledWith({ __db: true }, 'sessoes');
    expect(orderBy).toHaveBeenCalledWith('created_at', 'desc');
  });
});

describe('artesService.vincularSku', () => {
  it('grava o sku na arte certa preservando as demais', async () => {
    await artesService.vincularSku('sessao-A', 1, 'BR-2097');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = updateDoc.mock.calls[0];
    expect(payload).toHaveProperty('artes');
    const artes = payload.artes;
    expect(artes).toHaveLength(2);
    // arte 0 intacta (inclusive o sku que já tinha)
    expect(artes[0].sku).toBe('AN-1664');
    expect(artes[0].nome).toBe('Anel Fileira');
    // arte 1 ganhou o sku novo, campos preservados
    expect(artes[1].sku).toBe('BR-2097');
    expect(artes[1].nome).toBe('Brinco Argola');
    expect(artes[1].storage_url).toBe('https://fake/brinco.jpg');
  });

  it('aponta pro documento certo (sessoes/{sessaoId})', async () => {
    await artesService.vincularSku('sessao-A', 1, 'BR-2097');
    expect(doc).toHaveBeenCalledWith({ __db: true }, 'sessoes', 'sessao-A');
  });
});
