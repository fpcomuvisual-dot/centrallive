// tests/components/ImportarLoteModal.test.jsx
// CONTRATO do src/components/ImportarLoteModal.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Modal que lista lotes já processados no App 1 (via
// artesService.listarSessoes), pra operadora escolher um e importar
// TODOS os itens dele de uma vez pro catálogo da live.
//
// Props: { aberto, onFechar, onImportar }
//   onImportar(lote) — chamado com o objeto do lote inteiro
//   (incluindo lote.artes) quando a operadora clica nele
//
// - aberto=false → nada
// - aberto=true → dialog, chama artesService.listarSessoes() no
//   mount, lista cada lote: nome, "{vinculadas}/{total} vinculadas"
//   (vinculadas = artes com campo sku preenchido)
// - Clicar num lote → onImportar(lote), modal fecha (via onFechar)
// - Lote sem nenhuma arte vinculada ainda é clicável (mostra
//   "0/N vinculadas" — a operadora decide se quer mesmo assim,
//   mas nesse caso a importação real não vai adicionar nada,
//   isso é responsabilidade de quem chama onImportar)
// - Sem lotes: texto contendo "Nenhum lote"

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listarSessoes = vi.fn();
vi.mock('../../src/services/artes.js', () => ({
  artesService: { listarSessoes, vincularSku: vi.fn(), buscarImagemPorSku: vi.fn() },
}));

const { default: ImportarLoteModal } = await import('../../src/components/ImportarLoteModal.jsx');

const loteA = {
  id: 's1', nome: 'lote-3007-0900', total_artes: 3,
  artes: [
    { nome: 'Anel', sku: 'PC1A2B3' },
    { nome: 'Colar', sku: 'PC4D5E6' },
    { nome: 'Brinco' }, // sem sku
  ],
};
const loteB = { id: 's2', nome: 'lote-2907-1146', total_artes: 2, artes: [{ nome: 'X' }, { nome: 'Y' }] };

beforeEach(() => {
  listarSessoes.mockReset().mockResolvedValue([loteA, loteB]);
});

describe('ImportarLoteModal — visibilidade', () => {
  it('fechado não renderiza nada', () => {
    const { container } = render(
      <ImportarLoteModal aberto={false} onFechar={() => {}} onImportar={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('aberto lista os lotes com contagem de vinculadas', async () => {
    render(<ImportarLoteModal aberto={true} onFechar={() => {}} onImportar={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText('lote-3007-0900')).toBeInTheDocument();
    expect(screen.getByText(/2\/3 vinculadas/i)).toBeInTheDocument();
    expect(screen.getByText('lote-2907-1146')).toBeInTheDocument();
    expect(screen.getByText(/0\/2 vinculadas/i)).toBeInTheDocument();
  });

  it('sem lotes mostra estado vazio', async () => {
    listarSessoes.mockResolvedValue([]);
    render(<ImportarLoteModal aberto={true} onFechar={() => {}} onImportar={() => {}} />);
    expect(await screen.findByText(/nenhum lote/i)).toBeInTheDocument();
  });
});

describe('ImportarLoteModal — seleção', () => {
  it('clicar num lote chama onImportar com o lote inteiro e fecha', async () => {
    const onImportar = vi.fn();
    const onFechar = vi.fn();
    render(<ImportarLoteModal aberto={true} onFechar={onFechar} onImportar={onImportar} />);
    await userEvent.click(await screen.findByText('lote-3007-0900'));
    expect(onImportar).toHaveBeenCalledWith(loteA);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
