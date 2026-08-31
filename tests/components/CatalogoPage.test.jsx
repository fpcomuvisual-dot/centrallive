// tests/components/CatalogoPage.test.jsx
// CONTRATO do src/pages/CatalogoPage.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Sem props obrigatórias. A página usa artesService.listarSessoes()
// (mockado aqui — dependência, não módulo sob teste).
// Comportamento:
// - Enquanto carrega: indicador com texto contendo "Carregando"
// - Sem sessões: estado vazio com texto contendo "Nenhum lote"
// - Com sessões: um card por lote mostrando nome e contagem de artes
// - Card começa RECOLHIDO (artes não visíveis); clicar no nome do
//   lote expande e mostra as artes (via ArteCard — nome da arte
//   visível)
// - Campo de busca (placeholder contendo "Buscar") filtra artes
//   pelo nome em TODOS os lotes: digitou "colar" → lotes que não
//   têm "colar" somem da lista; artes que batem aparecem
// - Erro do serviço: mostra texto contendo "Erro ao carregar"

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listarSessoes = vi.fn();
const vincularSku = vi.fn();

vi.mock('../../src/services/artes.js', () => ({
  artesService: { listarSessoes, vincularSku },
}));

const { default: CatalogoPage } = await import('../../src/pages/CatalogoPage.jsx');

const sessoesFake = [
  {
    id: 's1',
    nome: 'lote-2506-1010',
    created_at: { seconds: 2000 },
    total_artes: 1,
    artes: [
      { nome: 'Colar Riviera', preco: 'R$ 23,50', parcelas: '10x R$ 2,35', storage_url: 'https://fake/c.jpg' },
    ],
  },
  {
    id: 's2',
    nome: 'lote-2406-0920',
    created_at: { seconds: 1000 },
    total_artes: 2,
    artes: [
      { nome: 'Anel Fileira', preco: 'R$ 10,00', parcelas: '10x R$ 1,00', storage_url: 'https://fake/a.jpg', sku: 'AN-1664' },
      { nome: 'Brinco Argola', preco: 'R$ 69,90', parcelas: '3x R$ 23,30', storage_url: 'https://fake/b.jpg' },
    ],
  },
];

beforeEach(() => {
  listarSessoes.mockReset();
  vincularSku.mockReset();
});

describe('CatalogoPage — estados de carregamento', () => {
  it('mostra "Carregando" enquanto busca e some depois', async () => {
    listarSessoes.mockResolvedValue(sessoesFake);
    render(<CatalogoPage />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText(/carregando/i));
  });

  it('estado vazio quando não há lotes', async () => {
    listarSessoes.mockResolvedValue([]);
    render(<CatalogoPage />);
    expect(await screen.findByText(/nenhum lote/i)).toBeInTheDocument();
  });

  it('erro do serviço mostra mensagem de erro', async () => {
    listarSessoes.mockRejectedValue(new Error('boom'));
    render(<CatalogoPage />);
    expect(await screen.findByText(/erro ao carregar/i)).toBeInTheDocument();
  });
});

describe('CatalogoPage — lotes e expansão', () => {
  it('lista um card por lote com nome', async () => {
    listarSessoes.mockResolvedValue(sessoesFake);
    render(<CatalogoPage />);
    expect(await screen.findByText('lote-2506-1010')).toBeInTheDocument();
    expect(screen.getByText('lote-2406-0920')).toBeInTheDocument();
  });

  it('lote começa recolhido; clicar expande e mostra as artes', async () => {
    listarSessoes.mockResolvedValue(sessoesFake);
    render(<CatalogoPage />);
    const loteHeader = await screen.findByText('lote-2406-0920');
    // recolhido: arte não visível
    expect(screen.queryByText('Anel Fileira')).not.toBeInTheDocument();
    await userEvent.click(loteHeader);
    // expandido: artes visíveis
    expect(await screen.findByText('Anel Fileira')).toBeInTheDocument();
    expect(screen.getByText('Brinco Argola')).toBeInTheDocument();
  });
});

describe('CatalogoPage — busca', () => {
  it('filtra artes pelo nome em todos os lotes', async () => {
    listarSessoes.mockResolvedValue(sessoesFake);
    render(<CatalogoPage />);
    await screen.findByText('lote-2506-1010');

    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'colar');

    // lote com match aparece com a arte visível
    expect(await screen.findByText('Colar Riviera')).toBeInTheDocument();
    // lote sem match some
    expect(screen.queryByText('lote-2406-0920')).not.toBeInTheDocument();
  });
});
