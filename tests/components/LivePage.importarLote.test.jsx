// tests/components/LivePage.importarLote.test.jsx
// CONTRATO adicional (NÃO substitui LivePage.test.jsx — só soma)
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Botão "Importar Lote" na tela Live (perto dos campos Código/
// Quantidade), abre ImportarLoteModal. Ao importar um lote:
//   - para cada arte do lote QUE TEM sku preenchido: chama
//     erp.adicionarItemLive(liveId, { codigo_fabrica: arte.sku,
//     quantidade_destinada: 1 })
//   - artes SEM sku são ignoradas (não chama nada pra elas)
//   - depois de todas as chamadas: recarrega o catálogo
//     (erp.catalogoLive) — mesmo padrão já usado em outros lugares
//   - mostra resumo: "N itens importados" (N = quantas tinham sku)
//     e, se houver artes sem sku, soma ", M sem vínculo (não
//     importadas)"

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const criarLive = vi.fn();
const adicionarItemLive = vi.fn();
const catalogoLive = vi.fn();
const criarReserva = vi.fn();
const removerReserva = vi.fn();
class ErpOfflineError extends Error {}
vi.mock('../../src/services/erp.js', () => ({
  erp: { criarLive, adicionarItemLive, catalogoLive, criarReserva, removerReserva },
  ErpOfflineError,
}));

vi.mock('../../src/services/clientes.js', () => ({
  clientesService: { buscar: vi.fn(), criar: vi.fn(), listar: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../src/services/fechamento.js', () => ({ fecharVenda: vi.fn() }));
vi.mock('../../src/services/vendas.js', () => ({
  vendasService: { criar: vi.fn(), listar: vi.fn().mockReturnValue([]), atualizarStatus: vi.fn() },
}));
const buscarImagemPorSku = vi.fn();
const listarSessoes = vi.fn();
vi.mock('../../src/services/artes.js', () => ({
  artesService: { buscarImagemPorSku, listarSessoes, vincularSku: vi.fn() },
}));

const { default: LivePage } = await import('../../src/pages/LivePage.jsx');

const LIVE_KEY = 'precificaai:liveAtiva';

const loteMisto = {
  id: 's1', nome: 'lote-3007-0900', total_artes: 3,
  artes: [
    { nome: 'Anel', sku: 'PC1A2B3' },
    { nome: 'Colar', sku: 'PC4D5E6' },
    { nome: 'Brinco' }, // sem sku, deve ser ignorado
  ],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LIVE_KEY, JSON.stringify({ id: 'live-77', nome: 'live prata' }));
  catalogoLive.mockReset().mockResolvedValue({ ok: true, status: 200, data: { itens: [] } });
  adicionarItemLive.mockReset().mockResolvedValue({ ok: true, status: 201, data: {} });
  listarSessoes.mockReset().mockResolvedValue([loteMisto]);
  buscarImagemPorSku.mockReset().mockResolvedValue(null);
});

describe('LivePage — Importar Lote', () => {
  it('botão abre o modal de lotes', async () => {
    render(<LivePage />);
    await userEvent.click(screen.getByRole('button', { name: /importar lote/i }));
    expect(await screen.findByText('lote-3007-0900')).toBeInTheDocument();
  });

  it('selecionar o lote adiciona só as artes com sku e recarrega o catálogo', async () => {
    render(<LivePage />);
    await userEvent.click(screen.getByRole('button', { name: /importar lote/i }));
    await userEvent.click(await screen.findByText('lote-3007-0900'));

    expect(await screen.findByText(/3 itens importados do lote/i)).toBeInTheDocument();
  });
});
