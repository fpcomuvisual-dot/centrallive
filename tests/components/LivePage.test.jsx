// tests/components/LivePage.test.jsx
// CONTRATO DEFINITIVO da src/pages/LivePage.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// ESTE ARQUIVO SUBSTITUI POR COMPLETO os 3 arquivos anteriores:
//   tests/components/LivePage.test.jsx (versão antiga)
//   tests/components/LivePage.variacoes.test.jsx
//   tests/components/LivePage.multiCarrinho.test.jsx
// APAGUE os 3 (o primeiro será sobrescrito por este mesmo nome —
// se você copiar este conteúdo por cima do arquivo antigo, já
// resolve; os outros dois, delete de verdade).
//
// MUDANÇA DE PRODUTO (decisão final do PO): NÃO EXISTE BOTÃO
// "RESERVAR" EM LUGAR NENHUM. A única forma de pôr uma peça num
// carrinho é ARRASTAR (drag) o produto (ou a linha de variação)
// até o card da cliente específica. Isso elimina ambiguidade de
// "pra qual carrinho vai" — quem arrasta escolhe o destino com a
// mão, não tem carrinho "ativo"/"em foco" implícito.
//
// Produto/variação com estoque ZERO fica DESLIGADO: visualmente
// acinzentado E não é mais arrastável (não tem o data-testid de
// draggable) — a operadora não consegue nem tentar arrastar algo
// que acabou.
//
// ===================== ESTRATÉGIA DE TESTE DE DRAG =====================
// Simular um drag de mouse/touch de verdade em teste automatizado é
// frágil e não é o que fazemos aqui. Testamos em DUAS camadas:
//   (1) a função pura `resolverDropMulti` (lógica: o que fazer dado
//       um drop) — 100% testável sem simular gesto nenhum
//   (2) a ESTRUTURA: que elementos arrastáveis existem, que dropzones
//       existem, e que itens esgotados NÃO têm elemento arrastável
// O gesto de arrastar em si (sensação, animação) é validado pelo PO
// no navegador, não aqui.
//
// ===================== CONTRATO =====================
//
// SEM LIVE ATIVA:
// - Mostra form (placeholder contendo "Nome da live") + botão
//   "Iniciar Live" → chama erp.criarLive({nome}) → salva
//   localStorage 'precificaai:liveAtiva' → mostra o nome
//
// CATÁLOGO (com live ativa, carregado via erp.catalogoLive no mount):
// - Cada produto SIMPLES (sem variacoes) vira linha compacta:
//   data-testid="produto-compacto", contendo <img> (opcional, via
//   artesService.buscarImagemPorSku), texto do codigo_fabrica, nome
//   em elemento <strong>
//   - estoque_disponivel > 0: tem data-testid="draggable-produto"
//     dentro da linha (é arrastável)
//   - estoque_disponivel === 0: NÃO tem "draggable-produto" (não é
//     arrastável) e mostra texto "ESGOTADO"
// - Produto COM variacoes: mostra botão "Ver variações" (SEM botão
//   Reservar em lugar nenhum). Expandir mostra data-testid=
//   "linha-variacao" por variação:
//   - estoque_disponivel > 0: tem data-testid="draggable-variacao"
//   - estoque_disponivel === 0: SEM "draggable-variacao", mostra
//     "ESGOTADO"
// - Input de busca (placeholder contendo "Buscar produto") filtra a
//   lista por nome ou codigo_fabrica
// - Form "adicionar item à live" (inputs placeholder "Código" e
//   "Quantidade" + botão "Adicionar à live") → erp.adicionarItemLive
//   → recarrega catálogo
//
// COLUNA CARRINHOS — "+ Novo Carrinho" é um BOTÃO DE VERDADE que
// ABRE UM PAINEL (não é atalho de focus em input sempre visível):
// - Sem clicar nada: NENHUM input de busca de cliente visível na
//   tela, só o botão "+ Novo Carrinho" e (se houver carrinhos) a
//   pilha deles + o input "Buscar carrinho" (esse sim sempre visível,
//   filtra os CARDS já existentes — é outro input, outro propósito)
// - Clicar "+ Novo Carrinho" → abre painel com input placeholder
//   contendo "Buscar ou cadastrar cliente"
//   - digitar chama clientesService.buscar(termo) (com debounce —
//     implementação livre, mas não pode disparar uma chamada por
//     tecla de forma que quebre o teste; o teste usa
//     mockResolvedValueOnce e espera só UMA chamada relevante)
//   - clicar num resultado → abrirCarrinho(cliente) → card aparece
//     no topo da pilha, painel fecha
//   - sem resultado: aparecem inputs "Nome" e "WhatsApp" + botão
//     "Cadastrar e abrir carrinho" → clientesService.criar →
//     abrirCarrinho com o cliente novo
//
// Input "Buscar carrinho" (sempre visível, fora do painel) filtra
// os cards renderizados pelo nome da cliente.
//
// CADA CARD: data-testid="carrinho-card", atributo data-cliente-id.
//   - status 'aberto': é uma dropzone (data-testid=
//     "dropzone-carrinho-card"), tem botão "Fechar"
//   - status 'fechado': NÃO é mais dropzone, tem botão "Enviar" (não
//     tem mais "Fechar")
//   - status 'enviado': sem nenhum botão, mostra texto contendo
//     "enviad"
//   Lista de itens dentro do card: data-testid="itens-carrinho"
//   (escopo restrito à lista, não ao card inteiro — evita capturar
//   o mesmo valor de preço do total numa busca de texto)
//   Cada item tem botão "Remover"
//   Total do carrinho (totalDoCarrinho) visível FORA do
//   data-testid="itens-carrinho", em formato BR
//
// DROP (via resolverDropMulti — mesmo contrato já validado antes):
//   resolverDropMulti({ dragData, dropTargetId })
//   dragData: { tipo:'produto', codigo_fabrica } ou
//             { tipo:'variacao', codigo_fabrica, variacao_id }
//   dropTargetId: 'carrinho-{clienteId}' válido, ou null/outro inválido
//   → nada | { acao:'reservar', clienteId, payload }
// Em uso real: ao soltar com sucesso (erp.criarReserva ok:true),
// chama adicionarItem(estado, clienteId, itemComReservaId) — o
// carrinho daquele cliente sobe pro topo (regra já validada em
// carrinhos.test.js). 409: mostra ESGOTADO, não adiciona a
// carrinho nenhum.
//
// REMOVER / FECHAR / ENVIAR — mesmo contrato de antes:
//   Remover → erp.removerReserva(reservaId) → removerItem(...)
//   Fechar (só em UI/estado, sem chamada externa) → fecharCarrinho(...)
//   Enviar → fecharVenda({cliente, itens, total}) daquele carrinho
//     específico → sucesso: vendasService.criar(...) +
//     marcarEnviado(...) → card mostra "enviad..."

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

const buscarCliente = vi.fn();
const criarCliente = vi.fn();
vi.mock('../../src/services/clientes.js', () => ({
  clientesService: { buscar: buscarCliente, criar: criarCliente, listar: vi.fn().mockResolvedValue([]) },
}));

const fecharVenda = vi.fn();
vi.mock('../../src/services/fechamento.js', () => ({ fecharVenda }));

const criarVenda = vi.fn();
vi.mock('../../src/services/vendas.js', () => ({
  vendasService: { criar: criarVenda, listar: vi.fn().mockReturnValue([]), atualizarStatus: vi.fn() },
}));

const buscarImagemPorSku = vi.fn();
vi.mock('../../src/services/artes.js', () => ({
  artesService: { buscarImagemPorSku, listarSessoes: vi.fn().mockResolvedValue([]), vincularSku: vi.fn() },
}));

const mod = await import('../../src/pages/LivePage.jsx');
const LivePage = mod.default;
const { resolverDropMulti } = mod;

const LIVE_KEY = 'precificaai:liveAtiva';
const maria = { id: 'c1', nome: 'Maria Silva', whatsapp: '5518999990001' };
const cintia = { id: 'c2', nome: 'Cintia Nascimento', whatsapp: '5518988887777' };

const catalogoBase = {
  ok: true, status: 200,
  data: {
    itens: [
      { codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR ROSA RODIO', preco_venda: 89.9, estoque_disponivel: 3 },
      { codigo_fabrica: 'BR-9999', descricao: 'BRINCO ESGOTADO', preco_venda: 15.0, estoque_disponivel: 0 },
      {
        codigo_fabrica: 'PR-001', descricao: 'PRESILHA BORBOLETA', preco_venda: 22.0, estoque_disponivel: 8,
        variacoes: [
          { id: 12, atributo1: 'prata', atributo2: 'grande', atributo3: '', preco_venda: 35.0, estoque_disponivel: 3 },
          { id: 13, atributo1: 'cravejada', atributo2: 'media', atributo3: '', preco_venda: 89.9, estoque_disponivel: 0 },
        ],
      },
    ],
  },
};

beforeEach(() => {
  localStorage.clear();
  criarLive.mockReset();
  adicionarItemLive.mockReset();
  catalogoLive.mockReset().mockResolvedValue(catalogoBase);
  criarReserva.mockReset().mockResolvedValue({ ok: true, status: 201, data: { id: 'res-1', status: 'ativa' } });
  removerReserva.mockReset().mockResolvedValue({ ok: true, status: 200, data: {} });
  buscarCliente.mockReset();
  criarCliente.mockReset();
  fecharVenda.mockReset().mockResolvedValue({ enviadas: 2, falhas: 0 });
  criarVenda.mockReset().mockImplementation((p) => ({ id: 'v1', status: 'enviado', ...p }));
  buscarImagemPorSku.mockReset().mockResolvedValue(null);
});

function comLiveAtiva() {
  localStorage.setItem(LIVE_KEY, JSON.stringify({ id: 'live-77', nome: 'live prata' }));
}

// ===================== Iniciar live =====================
describe('LivePage — iniciar live', () => {
  it('sem live ativa mostra o form e cria via ERP', async () => {
    criarLive.mockResolvedValue({ ok: true, status: 201, data: { id: 'live-99', nome: 'live ouro' } });
    render(<LivePage />);
    await userEvent.type(screen.getByPlaceholderText(/nome da live/i), 'live ouro');
    await userEvent.click(screen.getByRole('button', { name: /iniciar live/i }));
    expect(criarLive).toHaveBeenCalledWith({ nome: 'live ouro' });
    expect(await screen.findByText(/live ouro/)).toBeInTheDocument();
  });

  it('com live ativa carrega o catálogo no mount', async () => {
    comLiveAtiva();
    render(<LivePage />);
    expect(catalogoLive).toHaveBeenCalledWith('live-77');
    expect(await screen.findByText('ANEL FLOR ROSA RODIO')).toBeInTheDocument();
  });
});

// ===================== Catálogo compacto + esgotado =====================
describe('LivePage — produtos: compacto, arrastável, esgotado desligado', () => {
  it('linha compacta: sku, nome em <strong>, arrastável quando disponível', async () => {
    comLiveAtiva();
    render(<LivePage />);
    const linha = (await screen.findAllByTestId('produto-compacto'))
      .find((l) => within(l).queryByText('ANEL FLOR ROSA RODIO'));
    expect(within(linha).getByText('AN-1664')).toBeInTheDocument();
    expect(within(linha).getByText('ANEL FLOR ROSA RODIO').tagName.toLowerCase()).toBe('strong');
    expect(within(linha).getByTestId('draggable-produto')).toBeInTheDocument();
  });

  it('produto esgotado NÃO é arrastável e mostra ESGOTADO', async () => {
    comLiveAtiva();
    render(<LivePage />);
    const linhas = await screen.findAllByTestId('produto-compacto');
    const linhaEsgotada = linhas.find((l) => within(l).queryByText('BRINCO ESGOTADO'));
    expect(within(linhaEsgotada).queryByTestId('draggable-produto')).not.toBeInTheDocument();
    expect(within(linhaEsgotada).getByText(/esgotado/i)).toBeInTheDocument();
  });

  it('NENHUM botão "Reservar" existe em lugar nenhum da tela', async () => {
    comLiveAtiva();
    render(<LivePage />);
    await screen.findAllByTestId('produto-compacto');
    expect(screen.queryByRole('button', { name: /^reservar$/i })).not.toBeInTheDocument();
  });

  it('busca de produto filtra a lista', async () => {
    comLiveAtiva();
    render(<LivePage />);
    await screen.findAllByTestId('produto-compacto');
    await userEvent.type(screen.getByPlaceholderText(/buscar produto/i), 'presilha');
    const linhas = screen.getAllByTestId('produto-compacto');
    expect(linhas).toHaveLength(1);
  });

  it('adicionar item à live chama o ERP e recarrega', async () => {
    comLiveAtiva();
    adicionarItemLive.mockResolvedValue({ ok: true, status: 201, data: {} });
    render(<LivePage />);
    await screen.findAllByTestId('produto-compacto');
    await userEvent.type(screen.getByPlaceholderText(/código/i), 'BR-2103');
    await userEvent.type(screen.getByPlaceholderText(/quantidade/i), '4');
    await userEvent.click(screen.getByRole('button', { name: /adicionar à live/i }));
    expect(adicionarItemLive).toHaveBeenCalledWith('live-77', { codigo_fabrica: 'BR-2103', quantidade_destinada: 4 });
    expect(catalogoLive.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ===================== Variações: sem botão, drag por linha, esgotada desligada =====================
describe('LivePage — variações: Ver variações, drag por linha, esgotada desligada', () => {
  it('produto com variação mostra "Ver variações" (sem Reservar)', async () => {
    comLiveAtiva();
    render(<LivePage />);
    const linhas = await screen.findAllByTestId('produto-compacto');
    const linhaPresilha = linhas.find((l) => within(l).queryByText('PRESILHA BORBOLETA'));
    expect(within(linhaPresilha).getByRole('button', { name: /ver variações/i })).toBeInTheDocument();
    expect(within(linhaPresilha).queryByRole('button', { name: /^reservar$/i })).not.toBeInTheDocument();
  });

  it('expande e cada variação disponível é arrastável; esgotada não é', async () => {
    comLiveAtiva();
    render(<LivePage />);
    const linhas = await screen.findAllByTestId('produto-compacto');
    const linhaPresilha = linhas.find((l) => within(l).queryByText('PRESILHA BORBOLETA'));
    await userEvent.click(within(linhaPresilha).getByRole('button', { name: /ver variações/i }));

    const variacoes = await screen.findAllByTestId('linha-variacao');
    expect(variacoes).toHaveLength(2);

    const prata = variacoes.find((v) => within(v).queryByText(/prata/));
    expect(within(prata).getByTestId('draggable-variacao')).toBeInTheDocument();

    const cravejada = variacoes.find((v) => within(v).queryByText(/cravejada/));
    expect(within(cravejada).queryByTestId('draggable-variacao')).not.toBeInTheDocument();
    expect(within(cravejada).getByText(/esgotado/i)).toBeInTheDocument();
  });
});

// ===================== resolverDropMulti (função pura) =====================
describe('resolverDropMulti', () => {
  it('alvo inválido → nada', () => {
    expect(resolverDropMulti({ dragData: { tipo: 'produto', codigo_fabrica: 'AN-1664' }, dropTargetId: 'grid' }))
      .toEqual({ acao: 'nada' });
    expect(resolverDropMulti({ dragData: { tipo: 'produto', codigo_fabrica: 'AN-1664' }, dropTargetId: null }))
      .toEqual({ acao: 'nada' });
  });

  it('produto simples → reservar sem variacao_id', () => {
    expect(resolverDropMulti({ dragData: { tipo: 'produto', codigo_fabrica: 'AN-1664' }, dropTargetId: 'carrinho-c1' }))
      .toEqual({ acao: 'reservar', clienteId: 'c1', payload: { codigo_fabrica: 'AN-1664', cliente_ref: 'c1', ttl_minutos: 30 } });
  });

  it('variação → reservar com variacao_id', () => {
    expect(resolverDropMulti({
      dragData: { tipo: 'variacao', codigo_fabrica: 'PR-001', variacao_id: 12 }, dropTargetId: 'carrinho-c2',
    })).toEqual({
      acao: 'reservar', clienteId: 'c2',
      payload: { codigo_fabrica: 'PR-001', variacao_id: 12, cliente_ref: 'c2', ttl_minutos: 30 },
    });
  });
});

// ===================== Novo Carrinho (painel de verdade) =====================
describe('LivePage — Novo Carrinho abre painel de verdade', () => {
  it('sem clicar nada, input de busca de cliente NÃO está visível', async () => {
    comLiveAtiva();
    render(<LivePage />);
    await screen.findAllByTestId('produto-compacto');
    expect(screen.queryByPlaceholderText(/buscar ou cadastrar cliente/i)).not.toBeInTheDocument();
  });

  it('clica Novo Carrinho → busca → seleciona → card nasce no topo', async () => {
    comLiveAtiva();
    buscarCliente.mockResolvedValueOnce([maria]);
    render(<LivePage />);
    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'maria');
    await userEvent.click(await screen.findByText('Maria Silva'));

    const card = await screen.findByTestId('carrinho-card');
    expect(card).toHaveAttribute('data-cliente-id', 'c1');
    expect(within(card).getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/buscar ou cadastrar cliente/i)).not.toBeInTheDocument();
  });

  it('sem resultado → cadastro rápido → abre carrinho da nova cliente', async () => {
    comLiveAtiva();
    buscarCliente.mockResolvedValueOnce([]);
    criarCliente.mockResolvedValue({ id: 'c9', nome: 'Nova Cliente', whatsapp: '5518900000009' });
    render(<LivePage />);
    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(await screen.findByPlaceholderText(/^nome$/i), 'Nova Cliente');
    await userEvent.type(screen.getByPlaceholderText(/telefone/i), '5518900000009');
    await userEvent.click(screen.getByRole('button', { name: /ok — abrir carrinho/i }));

    expect(criarCliente).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Nova Cliente' }));
    const card = await screen.findByTestId('carrinho-card');
    expect(within(card).getByText('Nova Cliente')).toBeInTheDocument();
  });

  it('reabrir carrinho de cliente já existente não duplica, traz pro topo', async () => {
    comLiveAtiva();
    buscarCliente.mockResolvedValueOnce([maria]).mockResolvedValueOnce([cintia]).mockResolvedValueOnce([maria]);
    render(<LivePage />);

    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'maria');
    await userEvent.click(await screen.findByText('Maria Silva'));

    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'cintia');
    await userEvent.click(await screen.findByText('Cintia Nascimento'));

    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'maria');
    await userEvent.click(await screen.findByText('Maria Silva'));

    const cards = screen.getAllByTestId('carrinho-card');
    expect(cards).toHaveLength(2); // não duplicou
    expect(cards[0]).toHaveAttribute('data-cliente-id', 'c1'); // maria voltou ao topo
  });
});

// ===================== Busca de carrinho existente =====================
describe('LivePage — busca filtra carrinhos existentes', () => {
  it('filtra os cards pelo nome da cliente', async () => {
    comLiveAtiva();
    buscarCliente.mockResolvedValueOnce([maria]).mockResolvedValueOnce([cintia]);
    render(<LivePage />);

    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'maria');
    await userEvent.click(await screen.findByText('Maria Silva'));

    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'cintia');
    await userEvent.click(await screen.findByText('Cintia Nascimento'));

    expect(await screen.findAllByTestId('carrinho-card')).toHaveLength(2);

    await userEvent.type(screen.getByPlaceholderText(/buscar carrinho/i), 'cintia');
    const visiveis = screen.getAllByTestId('carrinho-card');
    expect(visiveis).toHaveLength(1);
    expect(within(visiveis[0]).getByText('Cintia Nascimento')).toBeInTheDocument();
  });
});

// ===================== Remover / Fechar / Enviar =====================
describe('LivePage — remover, fechar, enviar (via integração da lógica de reserva)', () => {
  // Simula o efeito de um drop bem-sucedido diretamente através do fluxo
  // que a LivePage já expõe: abrir carrinho + expor uma forma programática
  // de aplicar o resultado de resolverDropMulti (a LivePage deve ter um
  // handler interno chamado, por exemplo, handleDropResolvido, usado tanto
  // pelo onDragEnd real quanto testável). Se a única forma de popular um
  // carrinho na sua implementação for através de um evento de drag real
  // do @dnd-kit (não simulável facilmente aqui), EXPONHA esse handler como
  // prop/named-export testável — se isso não for possível do jeito que
  // você desenhou, PARE e reporte exatamente qual caminho você tomou,
  // não invente um botão "Reservar" escondido só pra satisfazer este teste.
  async function abrirCarrinhoComItem() {
    buscarCliente.mockResolvedValue([maria]);
    comLiveAtiva();
    render(<LivePage />);
    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'maria');
    await userEvent.click(await screen.findByText('Maria Silva'));
    const card = await screen.findByTestId('carrinho-card');

    // Aciona o handler de drop resolvido diretamente (ver nota acima)
    const handler = mod.__test__handleDropResolvido;
    expect(typeof handler).toBe('function');
    await handler({
      dragData: { tipo: 'produto', codigo_fabrica: 'AN-1664' },
      dropTargetId: `carrinho-${maria.id}`,
    });

    await within(card).findByText(/ANEL FLOR ROSA RODIO/);
    return card;
  }

  it('drop bem-sucedido reserva no ERP e põe o item no card certo', async () => {
    const card = await abrirCarrinhoComItem();
    expect(criarReserva).toHaveBeenCalledWith('live-77', {
      codigo_fabrica: 'AN-1664', cliente_ref: 'c1', ttl_minutos: 30,
    });
    expect(within(card).getByTestId('itens-carrinho')).toHaveTextContent('89,90');
  });

  it('remover item chama erp.removerReserva e tira do card', async () => {
    const card = await abrirCarrinhoComItem();
    await userEvent.click(within(card).getByRole('button', { name: /remover/i }));
    expect(removerReserva).toHaveBeenCalledWith('res-1');
    expect(within(card).queryByText(/ANEL FLOR ROSA RODIO/)).not.toBeInTheDocument();
  });

  it('Fechar muda pra fechado, mostra Enviar, deixa de ser dropzone', async () => {
    const card = await abrirCarrinhoComItem();
    await userEvent.click(within(card).getByRole('button', { name: /^fechar$/i }));
    expect(within(card).queryByRole('button', { name: /^fechar$/i })).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /enviar/i })).toBeInTheDocument();
    expect(within(card).queryByTestId('dropzone-carrinho-card')).not.toBeInTheDocument();
  });

  it('Enviar dispara fecharVenda do carrinho específico e marca enviado', async () => {
    const card = await abrirCarrinhoComItem();
    await userEvent.click(within(card).getByRole('button', { name: /^fechar$/i }));
    await userEvent.click(within(card).getByRole('button', { name: /enviar/i }));

    expect(fecharVenda).toHaveBeenCalledTimes(1);
    const arg = fecharVenda.mock.calls[0][0];
    expect(arg.cliente).toMatchObject({ nome: 'Maria Silva' });
    expect(arg.total).toBeCloseTo(89.9);
    expect(await within(card).findByText(/enviad/i)).toBeInTheDocument();
    expect(criarVenda).toHaveBeenCalledTimes(1);
  });

  it('409 no drop: mostra ESGOTADO, não adiciona a nenhum carrinho', async () => {
    criarReserva.mockResolvedValue({ ok: false, status: 409, data: { erro: 'estoque_esgotado' } });
    comLiveAtiva();
    buscarCliente.mockResolvedValue([maria]);
    render(<LivePage />);
    await userEvent.click(screen.getByRole('button', { name: /novo carrinho/i }));
    await userEvent.type(screen.getByPlaceholderText(/buscar ou cadastrar cliente/i), 'maria');
    await userEvent.click(await screen.findByText('Maria Silva'));
    const card = await screen.findByTestId('carrinho-card');

    const handler = mod.__test__handleDropResolvido;
    await handler({ dragData: { tipo: 'produto', codigo_fabrica: 'AN-1664' }, dropTargetId: `carrinho-${maria.id}` });

    expect(within(card).queryByText(/ANEL FLOR ROSA RODIO/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/esgotado/i).length).toBeGreaterThanOrEqual(1);
  });
});
