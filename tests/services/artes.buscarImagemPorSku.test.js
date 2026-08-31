// tests/services/artes.buscarImagemPorSku.test.js
// CONTRATO do método NOVO artesService.buscarImagemPorSku
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
//   artesService.buscarImagemPorSku(sku) → Promise<string|null>
//   Varre as sessões (listarSessoes ou query equivalente) e devolve
//   o storage_url da PRIMEIRA arte cujo campo sku === sku.
//   Nenhuma arte com o sku → null (não lança).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fakeDocs = [
  {
    id: 's1',
    data: () => ({
      nome: 'lote-a', created_at: { seconds: 2 }, total_artes: 1,
      artes: [
        { nome: 'Presilha', preco: 'R$ 22,00', storage_url: 'https://fake/presilha.jpg', sku: 'PR-0101' },
      ],
    }),
  },
  {
    id: 's2',
    data: () => ({
      nome: 'lote-b', created_at: { seconds: 1 }, total_artes: 2,
      artes: [
        { nome: 'Anel', preco: 'R$ 89,90', storage_url: 'https://fake/anel.jpg', sku: 'AN-1664' },
        { nome: 'Brinco sem sku', preco: 'R$ 10,00', storage_url: 'https://fake/brinco.jpg' },
      ],
    }),
  },
];

const getDocs = vi.fn(async () => ({ docs: fakeDocs }));
vi.mock('firebase/firestore', () => ({
  getDocs,
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  query: vi.fn((...a) => ({ a })),
  orderBy: vi.fn(() => ({})),
}));
vi.mock('../../src/services/firebase.js', () => ({ db: {}, storage: {} }));

const { artesService } = await import('../../src/services/artes.js');

beforeEach(() => getDocs.mockClear());

describe('artesService.buscarImagemPorSku', () => {
  it('acha a arte pelo sku e devolve o storage_url', async () => {
    const url = await artesService.buscarImagemPorSku('AN-1664');
    expect(url).toBe('https://fake/anel.jpg');
  });

  it('sku em outra sessão também é achado', async () => {
    const url = await artesService.buscarImagemPorSku('PR-0101');
    expect(url).toBe('https://fake/presilha.jpg');
  });

  it('sku inexistente devolve null sem lançar', async () => {
    const url = await artesService.buscarImagemPorSku('XX-9999');
    expect(url).toBeNull();
  });
});
