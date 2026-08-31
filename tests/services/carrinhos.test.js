// tests/services/carrinhos.test.js
// CONTRATO do src/services/carrinhos.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// PASSO 1 do T-UI-003: lógica pura de múltiplos carrinhos simultâneos,
// um por cliente. Testada em ISOLAMENTO (sem renderizar nada) pra não
// arriscar os ~30 testes de LivePage que já existem. A conexão disso
// na tela (drag-and-drop mirando um carrinho específico, botão Enviar
// por card) é o PASSO 2, feito depois que este passo estiver verde.
//
// Módulo exporta funções PURAS (sempre devolvem um novo estado, nunca
// mutam o argumento recebido):
//
//   estadoInicial()
//     → { carrinhos: [] }
//     carrinhos é a pilha, ORDEM = mais recentemente atualizado primeiro
//
//   abrirCarrinho(estado, cliente)
//     cliente: { id, nome, whatsapp }
//     → se já existe carrinho pra esse cliente.id: só traz ele pro
//       topo da pilha (sem duplicar, sem apagar itens)
//     → se não existe: cria um novo { clienteId, cliente, itens: [],
//       status: 'aberto' } e coloca no topo
//
//   adicionarItem(estado, clienteId, item)
//     item: { codigo_fabrica, descricao, preco_venda, reservaId,
//             variacao_id?, atributos? }
//     → adiciona o item na lista daquele cliente E traz o carrinho
//       dele pro TOPO da pilha (regra: peça nova sobe pro topo)
//     → clienteId sem carrinho aberto: lança Error (precisa abrir
//       carrinho antes)
//
//   removerItem(estado, clienteId, reservaId)
//     → remove só aquele item da lista do cliente; NÃO reordena a
//       pilha (remover não traz pro topo)
//
//   fecharCarrinho(estado, clienteId)
//     → muda status daquele carrinho pra 'fechado'. NÃO reordena.
//
//   marcarEnviado(estado, clienteId)
//     → muda status pra 'enviado' (usado depois que o FECHAR VENDA
//       real disparou pro WhatsApp)
//
//   totalDoCarrinho(carrinho)
//     → soma preco_venda de todos os itens (número)

import { describe, it, expect } from 'vitest';
import {
  estadoInicial,
  abrirCarrinho,
  adicionarItem,
  removerItem,
  fecharCarrinho,
  marcarEnviado,
  totalDoCarrinho,
} from '../../src/services/carrinhos.js';

const maria = { id: 'c1', nome: 'Maria Silva', whatsapp: '5518999990001' };
const cintia = { id: 'c2', nome: 'Cintia Nascimento', whatsapp: '5518988887777' };

const itemAnel = { codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR ROSA', preco_venda: 89.9, reservaId: 'res-1' };
const itemPresilha = { codigo_fabrica: 'PR-001', descricao: 'PRESILHA BORBOLETA', preco_venda: 22.0, reservaId: 'res-2' };

describe('estadoInicial', () => {
  it('começa com pilha vazia', () => {
    expect(estadoInicial()).toEqual({ carrinhos: [] });
  });
});

describe('abrirCarrinho', () => {
  it('cria carrinho novo, aberto, vazio, no topo', () => {
    const e1 = abrirCarrinho(estadoInicial(), maria);
    expect(e1.carrinhos).toHaveLength(1);
    expect(e1.carrinhos[0]).toMatchObject({
      clienteId: 'c1', cliente: maria, itens: [], status: 'aberto',
    });
  });

  it('cliente já com carrinho: não duplica, só traz pro topo', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = abrirCarrinho(e, cintia);
    // maria está embaixo agora; abrir de novo pra maria deve trazê-la ao topo
    e = abrirCarrinho(e, maria);
    expect(e.carrinhos).toHaveLength(2);
    expect(e.carrinhos[0].clienteId).toBe('c1');
  });

  it('não muta o estado recebido (imutabilidade)', () => {
    const original = estadoInicial();
    abrirCarrinho(original, maria);
    expect(original.carrinhos).toHaveLength(0);
  });
});

describe('adicionarItem', () => {
  it('adiciona item na lista do cliente certo', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = adicionarItem(e, 'c1', itemAnel);
    expect(e.carrinhos[0].itens).toHaveLength(1);
    expect(e.carrinhos[0].itens[0].reservaId).toBe('res-1');
  });

  it('item novo traz o carrinho do cliente pro TOPO da pilha', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = abrirCarrinho(e, cintia); // cintia no topo agora
    expect(e.carrinhos[0].clienteId).toBe('c2');

    e = adicionarItem(e, 'c1', itemAnel); // maria recebe item → sobe
    expect(e.carrinhos[0].clienteId).toBe('c1');
    expect(e.carrinhos[1].clienteId).toBe('c2');
  });

  it('clienteId sem carrinho aberto lança erro', () => {
    expect(() => adicionarItem(estadoInicial(), 'c-fantasma', itemAnel)).toThrow();
  });
});

describe('removerItem', () => {
  it('remove só o item pedido, mantém os demais', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = adicionarItem(e, 'c1', itemAnel);
    e = adicionarItem(e, 'c1', itemPresilha);
    e = removerItem(e, 'c1', 'res-1');
    expect(e.carrinhos[0].itens).toHaveLength(1);
    expect(e.carrinhos[0].itens[0].reservaId).toBe('res-2');
  });

  it('remover NÃO reordena a pilha', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = abrirCarrinho(e, cintia);
    e = adicionarItem(e, 'c1', itemAnel); // maria vai pro topo
    e = adicionarItem(e, 'c2', itemPresilha); // cintia vai pro topo
    expect(e.carrinhos[0].clienteId).toBe('c2');
    e = removerItem(e, 'c1', 'res-1'); // mexe na maria, que está embaixo
    expect(e.carrinhos[0].clienteId).toBe('c2'); // ordem não mudou
  });
});

describe('fecharCarrinho e marcarEnviado', () => {
  it('fecharCarrinho muda status pra fechado sem reordenar', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = abrirCarrinho(e, cintia);
    e = fecharCarrinho(e, 'c1'); // maria está embaixo, fecha sem mexer na ordem
    const doMaria = e.carrinhos.find((c) => c.clienteId === 'c1');
    expect(doMaria.status).toBe('fechado');
    expect(e.carrinhos[0].clienteId).toBe('c2'); // ordem intacta
  });

  it('marcarEnviado muda status pra enviado', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = fecharCarrinho(e, 'c1');
    e = marcarEnviado(e, 'c1');
    expect(e.carrinhos[0].status).toBe('enviado');
  });
});

describe('totalDoCarrinho', () => {
  it('soma os preços dos itens', () => {
    let e = abrirCarrinho(estadoInicial(), maria);
    e = adicionarItem(e, 'c1', itemAnel);
    e = adicionarItem(e, 'c1', itemPresilha);
    expect(totalDoCarrinho(e.carrinhos[0])).toBeCloseTo(111.9);
  });

  it('carrinho vazio soma zero', () => {
    const e = abrirCarrinho(estadoInicial(), maria);
    expect(totalDoCarrinho(e.carrinhos[0])).toBe(0);
  });
});
