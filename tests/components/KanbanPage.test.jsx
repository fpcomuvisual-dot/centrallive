// tests/components/KanbanPage.test.jsx
// CONTRATO do src/pages/KanbanPage.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Kanban de vendas fechadas. Colunas fixas nesta ordem, com
// data-testid: coluna-enviado | coluna-pago | coluna-separado |
// coluna-entregue.
// - Cada venda (vendasService.listar) vira card na coluna do seu
//   status, mostrando nome da cliente e total em formato BR
// - Botão "Avançar" no card:
//   * enviado → pago: ANTES de mover, chama erp.confirmarReserva
//     para CADA reservaId dos itens (baixa definitiva). Só então
//     vendasService.atualizarStatus(id,'pago') e o card muda de
//     coluna. Se confirmarReserva lançar (ErpOfflineError):
//     mostra texto contendo "ERP" (erro) e NÃO atualiza status.
//   * pago → separado e separado → entregue: só atualizarStatus
//     (sem ERP)
//   * entregue: sem botão Avançar
// - Cada card tem botão "Abrir no WhatsApp" (fallback manual):
//   window.open com URL https://wa.me/{whatsapp}?text=... onde o
//   texto (URL-encoded) contém o total em formato BR
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listar = vi.fn();
const atualizarStatus = vi.fn();
vi.mock('../../src/services/vendas.js', () => ({
  vendasService: { listar, atualizarStatus, criar: vi.fn() },
}));

const confirmarReserva = vi.fn();
class ErpOfflineError extends Error {}
vi.mock('../../src/services/erp.js', () => ({
  erp: {
    confirmarReserva,
    criarLive: vi.fn(), adicionarItemLive: vi.fn(), catalogoLive: vi.fn(),
    criarReserva: vi.fn(), removerReserva: vi.fn(), buscarProdutos: vi.fn(),
  },
  ErpOfflineError,
}));

const { default: KanbanPage } = await import('../../src/pages/KanbanPage.jsx');

const vendaEnviada = {
  id: 'v1', status: 'enviado', criada_em: '2026-07-29T17:20:00Z',
  cliente: { id: 'c1', nome: 'Maria Silva', whatsapp: '5518999990001' },
  itens: [
    { codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR', preco_venda: 89.9, reservaId: 'res-1' },
    { codigo_fabrica: 'PR-0101', descricao: 'PRESILHA', preco_venda: 22.0, reservaId: 'res-2' },
  ],
  total: 111.9,
};
const vendaPaga = {
  id: 'v2', status: 'pago', criada_em: '2026-07-29T17:00:00Z',
  cliente: { id: 'c2', nome: 'Joana Prado', whatsapp: '5518999990002' },
  itens: [{ codigo_fabrica: 'BR-2103', descricao: 'BRINCO', preco_venda: 39.9, reservaId: 'res-3' }],
  total: 39.9,
};

let openSpy;
beforeEach(() => {
  listar.mockReset().mockReturnValue([vendaEnviada, vendaPaga]);
  atualizarStatus.mockReset().mockImplementation((id, s) => ({ ...vendaEnviada, id, status: s }));
  confirmarReserva.mockReset().mockResolvedValue({ ok: true, status: 200, data: { status: 'confirmada' } });
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});
afterEach(() => openSpy.mockRestore());

describe('KanbanPage — colunas e cards', () => {
  it('renderiza as 4 colunas e cada venda na coluna do status', async () => {
    render(<KanbanPage />);
    const colEnviado = await screen.findByTestId('coluna-enviado');
    const colPago = screen.getByTestId('coluna-pago');
    expect(screen.getByTestId('coluna-separado')).toBeInTheDocument();
    expect(screen.getByTestId('coluna-entregue')).toBeInTheDocument();
    expect(within(colEnviado).getByText('Maria Silva')).toBeInTheDocument();
    expect(within(colEnviado).getByText(/111,90/)).toBeInTheDocument();
    expect(within(colPago).getByText('Joana Prado')).toBeInTheDocument();
  });
});

describe('KanbanPage — avançar', () => {
  it('enviado → pago confirma TODAS as reservas antes de mover', async () => {
    render(<KanbanPage />);
    const colEnviado = await screen.findByTestId('coluna-enviado');
    const card = within(colEnviado).getByText('Maria Silva').closest('[data-testid="card-venda"]');
    await userEvent.click(within(card).getByRole('button', { name: /avançar/i }));

    expect(confirmarReserva).toHaveBeenCalledTimes(2);
    expect(confirmarReserva).toHaveBeenCalledWith('res-1');
    expect(confirmarReserva).toHaveBeenCalledWith('res-2');
    expect(atualizarStatus).toHaveBeenCalledWith('v1', 'pago');
    const colPago = screen.getByTestId('coluna-pago');
    expect(await within(colPago).findByText('Maria Silva')).toBeInTheDocument();
  });

  it('ERP fora ao confirmar: mostra erro e NÃO move', async () => {
    confirmarReserva.mockRejectedValue(new ErpOfflineError('down'));
    render(<KanbanPage />);
    const colEnviado = await screen.findByTestId('coluna-enviado');
    const card = within(colEnviado).getByText('Maria Silva').closest('[data-testid="card-venda"]');
    await userEvent.click(within(card).getByRole('button', { name: /avançar/i }));

    expect(await screen.findByText(/erp/i)).toBeInTheDocument();
    expect(atualizarStatus).not.toHaveBeenCalled();
    expect(within(screen.getByTestId('coluna-enviado')).getByText('Maria Silva')).toBeInTheDocument();
  });

  it('pago → separado não toca no ERP', async () => {
    render(<KanbanPage />);
    const colPago = await screen.findByTestId('coluna-pago');
    const card = within(colPago).getByText('Joana Prado').closest('[data-testid="card-venda"]');
    await userEvent.click(within(card).getByRole('button', { name: /avançar/i }));
    expect(confirmarReserva).not.toHaveBeenCalled();
    expect(atualizarStatus).toHaveBeenCalledWith('v2', 'separado');
  });
});

describe('KanbanPage — fallback wa.me', () => {
  it('Abrir no WhatsApp monta wa.me com número e total', async () => {
    render(<KanbanPage />);
    const colEnviado = await screen.findByTestId('coluna-enviado');
    const card = within(colEnviado).getByText('Maria Silva').closest('[data-testid="card-venda"]');
    await userEvent.click(within(card).getByRole('button', { name: /abrir no whatsapp/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0];
    expect(url).toContain('wa.me/5518999990001');
    expect(url).toContain(encodeURIComponent('111,90'));
  });
});
