// tests/components/GerenciarVariacoesModal.test.jsx
// CONTRATO do src/components/GerenciarVariacoesModal.jsx
// e dos métodos NOVOS do src/services/erp.js:
//   erp.listarVariacoes(codigoFabrica)      → GET  /produtos/{codigo}/variacoes
//   erp.criarVariacao(codigoFabrica, body)  → POST /produtos/{codigo}/variacoes
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Modal pra Primicias/Luluzinha montarem a grade de variações.
// Props: { aberto, codigoFabrica, descricao, onFechar }
// - aberto=false → nada
// - aberto=true → dialog com a descricao do produto; no mount
//   chama erp.listarVariacoes e lista cada variação existente
//   (atributos + preço BR + estoque)
// - Form de nova variação: inputs com placeholders contendo
//   "Atributo 1", "Atributo 2", "Atributo 3", "Preço", "Estoque"
//   + botão "Adicionar variação"
// - Submit chama erp.criarVariacao(codigoFabrica, { atributo1,
//   atributo2, atributo3, preco_venda: number, estoque: number })
//   e recarrega a lista
// - Resposta 409 (combinação duplicada) → texto contendo
//   "já existe" (sem quebrar)
// - Atributo 1 vazio → não chama criarVariacao e mostra texto
//   contendo "obrigatório"
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listarVariacoes = vi.fn();
const criarVariacao = vi.fn();
class ErpOfflineError extends Error {}
vi.mock('../../src/services/erp.js', () => ({
  erp: {
    listarVariacoes, criarVariacao,
    criarLive: vi.fn(), adicionarItemLive: vi.fn(), catalogoLive: vi.fn(),
    criarReserva: vi.fn(), removerReserva: vi.fn(), buscarProdutos: vi.fn(),
    confirmarReserva: vi.fn(),
  },
  ErpOfflineError,
}));

const { default: GerenciarVariacoesModal } = await import(
  '../../src/components/GerenciarVariacoesModal.jsx'
);

beforeEach(() => {
  listarVariacoes.mockReset().mockResolvedValue({
    ok: true, status: 200,
    data: {
      variacoes: [
        { id: 11, atributo1: 'dourada', atributo2: 'média', atributo3: '', preco_venda: 22.0, estoque: 5 },
      ],
    },
  });
  criarVariacao.mockReset().mockResolvedValue({
    ok: true, status: 201,
    data: { id: 12, atributo1: 'prata', atributo2: 'grande', atributo3: '', preco_venda: 35.0, estoque: 3 },
  });
});

const props = {
  aberto: true,
  codigoFabrica: 'PR-001',
  descricao: 'PRESILHA BORBOLETA',
  onFechar: () => {},
};

describe('GerenciarVariacoesModal — visibilidade e listagem', () => {
  it('fechado não renderiza nada', () => {
    const { container } = render(<GerenciarVariacoesModal {...props} aberto={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('aberto lista as variações existentes do produto', async () => {
    render(<GerenciarVariacoesModal {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/PRESILHA BORBOLETA/)).toBeInTheDocument();
    expect(listarVariacoes).toHaveBeenCalledWith('PR-001');
    expect(await screen.findByText(/dourada/)).toBeInTheDocument();
    expect(screen.getByText(/22,00/)).toBeInTheDocument();
  });
});

describe('GerenciarVariacoesModal — criação', () => {
  it('cria variação com payload numérico e recarrega a lista', async () => {
    render(<GerenciarVariacoesModal {...props} />);
    await screen.findByText(/dourada/);

    await userEvent.type(screen.getByPlaceholderText(/atributo 1/i), 'prata');
    await userEvent.type(screen.getByPlaceholderText(/atributo 2/i), 'grande');
    await userEvent.type(screen.getByPlaceholderText(/preço/i), '35');
    await userEvent.type(screen.getByPlaceholderText(/estoque/i), '3');
    await userEvent.click(screen.getByRole('button', { name: /adicionar variação/i }));

    expect(criarVariacao).toHaveBeenCalledWith('PR-001', {
      atributo1: 'prata',
      atributo2: 'grande',
      atributo3: '',
      preco_venda: 35,
      estoque: 3,
    });
    expect(listarVariacoes.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('409 mostra combinação já existe', async () => {
    criarVariacao.mockResolvedValue({ ok: false, status: 409, data: {} });
    render(<GerenciarVariacoesModal {...props} />);
    await screen.findByText(/dourada/);

    await userEvent.type(screen.getByPlaceholderText(/atributo 1/i), 'dourada');
    await userEvent.type(screen.getByPlaceholderText(/atributo 2/i), 'média');
    await userEvent.type(screen.getByPlaceholderText(/preço/i), '22');
    await userEvent.type(screen.getByPlaceholderText(/estoque/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /adicionar variação/i }));

    expect(await screen.findByText(/já existe/i)).toBeInTheDocument();
  });

  it('atributo 1 vazio não cria e avisa obrigatório', async () => {
    render(<GerenciarVariacoesModal {...props} />);
    await screen.findByText(/dourada/);
    await userEvent.type(screen.getByPlaceholderText(/preço/i), '10');
    await userEvent.type(screen.getByPlaceholderText(/estoque/i), '1');
    await userEvent.click(screen.getByRole('button', { name: /adicionar variação/i }));

    expect(criarVariacao).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigat/i)).toBeInTheDocument();
  });
});
