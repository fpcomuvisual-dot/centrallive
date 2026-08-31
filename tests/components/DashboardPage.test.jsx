// tests/components/DashboardPage.test.jsx
// CONTRATO do src/pages/DashboardPage.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Tela inicial (primeira coisa que aparece ao abrir o App 3).
// Consome clientesService, erp (listarProdutos), vendasService —
// tudo já existente, exceto o método erp.listarProdutos (novo,
// contrato em tests/services/erp.listarProdutos.test.js).
//
// Props: { onNavigate } — função chamada com 'catalogo' | 'live' |
//        'kanban' quando os botões de atalho são clicados
//
// Comportamento:
// - Mostra saudação estática, texto contendo "Central de Vendas"
// - Enquanto carrega: texto contendo "Carregando"
// - 3 cards com números:
//   - total de clientes (clientesService.listar().length)
//   - total de produtos (erp.listarProdutos().data.produtos.length)
//   - total vendido (soma de venda.total de vendasService.listar())
// - Lista "Últimas vendas": até 3 vendas, ORDENADAS por criada_em
//   DESC (mais recente primeiro), mostrando nome da cliente + total
//   em formato BR
// - Sem nenhuma venda: texto contendo "Nenhuma venda"
// - 3 botões: "Ir pra Catálogo", "Iniciar Live", "Ver Kanban" —
//   cada um chama onNavigate('catalogo' | 'live' | 'kanban')
// - Se erp.listarProdutos falhar (ErpOfflineError): o card de
//   produtos mostra "—" (ou similar indicador de indisponível) em
//   vez de travar a tela inteira; os OUTROS cards (clientes, vendas)
//   continuam funcionando normalmente

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listarClientes = vi.fn();
vi.mock('../../src/services/clientes.js', () => ({
  clientesService: { listar: listarClientes, buscar: vi.fn(), criar: vi.fn() },
}));

const listarProdutos = vi.fn();
class ErpOfflineError extends Error {}
vi.mock('../../src/services/erp.js', () => ({
  erp: {
    listarProdutos,
    criarLive: vi.fn(), adicionarItemLive: vi.fn(), catalogoLive: vi.fn(),
    criarReserva: vi.fn(), removerReserva: vi.fn(), buscarProdutos: vi.fn(),
    confirmarReserva: vi.fn(),
  },
  ErpOfflineError,
}));

const listarVendas = vi.fn();
vi.mock('../../src/services/vendas.js', () => ({
  vendasService: { listar: listarVendas, criar: vi.fn(), atualizarStatus: vi.fn() },
}));

const { default: DashboardPage } = await import('../../src/pages/DashboardPage.jsx');

const vendaAntiga = {
  id: 'v1', status: 'pago', criada_em: '2026-07-29T10:00:00Z',
  cliente: { nome: 'Ana Claudia' }, itens: [], total: 50.0,
};
const vendaRecente = {
  id: 'v2', status: 'enviado', criada_em: '2026-07-30T18:00:00Z',
  cliente: { nome: 'Maria Silva' }, itens: [], total: 89.9,
};
const vendaMeio = {
  id: 'v3', status: 'pago', criada_em: '2026-07-30T09:00:00Z',
  cliente: { nome: 'Cintia Nascimento' }, itens: [], total: 22.0,
};

beforeEach(() => {
  listarClientes.mockReset().mockResolvedValue(new Array(52).fill({ nome: 'x' }));
  listarProdutos.mockReset().mockResolvedValue({
    ok: true, status: 200, data: { produtos: new Array(7).fill({}) },
  });
  listarVendas.mockReset().mockReturnValue([vendaAntiga, vendaRecente, vendaMeio]);
});

describe('DashboardPage — saudação e carregamento', () => {
  it('mostra saudação com Central de Vendas', async () => {
    render(<DashboardPage onNavigate={() => {}} />);
    expect(await screen.findByText(/central de vendas/i)).toBeInTheDocument();
  });
});

describe('DashboardPage — cards de resumo', () => {
  it('mostra total de clientes, produtos e vendido', async () => {
    render(<DashboardPage onNavigate={() => {}} />);
    expect(await screen.findByText('52')).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
    const total = vendaAntiga.total + vendaRecente.total + vendaMeio.total;
    const totalFormatado = total.toFixed(2).replace('.', ',');
    expect(await screen.findByText(new RegExp(totalFormatado))).toBeInTheDocument();
  });

  it('produtos indisponível (ERP offline) não trava os outros cards', async () => {
    listarProdutos.mockRejectedValue(new ErpOfflineError('down'));
    render(<DashboardPage onNavigate={() => {}} />);
    expect(await screen.findByText('52')).toBeInTheDocument(); // clientes ok
    expect(screen.getByText('—')).toBeInTheDocument(); // produtos indisponível
  });
});

describe('DashboardPage — últimas vendas', () => {
  it('lista até 3, mais recente primeiro', async () => {
    render(<DashboardPage onNavigate={() => {}} />);
    const lista = await screen.findByTestId('ultimas-vendas');
    const itens = within(lista).getAllByTestId('venda-recente-item');
    expect(itens).toHaveLength(3);
    expect(within(itens[0]).getByText(/Maria Silva/)).toBeInTheDocument();
    expect(within(itens[1]).getByText(/Cintia Nascimento/)).toBeInTheDocument();
    expect(within(itens[2]).getByText(/Ana Claudia/)).toBeInTheDocument();
  });

  it('sem vendas mostra estado vazio', async () => {
    listarVendas.mockReturnValue([]);
    render(<DashboardPage onNavigate={() => {}} />);
    expect(await screen.findByText(/nenhuma venda/i)).toBeInTheDocument();
  });
});

describe('DashboardPage — navegação', () => {
  it('botões chamam onNavigate com o destino certo', async () => {
    const onNavigate = vi.fn();
    render(<DashboardPage onNavigate={onNavigate} />);
    await screen.findByText('52');

    await userEvent.click(screen.getByRole('button', { name: /ir pra catálogo/i }));
    expect(onNavigate).toHaveBeenCalledWith('catalogo');

    await userEvent.click(screen.getByRole('button', { name: /iniciar live/i }));
    expect(onNavigate).toHaveBeenCalledWith('live');

    await userEvent.click(screen.getByRole('button', { name: /ver kanban/i }));
    expect(onNavigate).toHaveBeenCalledWith('kanban');
  });
});
