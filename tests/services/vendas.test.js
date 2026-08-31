// tests/services/vendas.test.js
// CONTRATO do src/services/vendas.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Vendas fechadas (pós FECHAR VENDA) — base do kanban.
// Implementação provisória em localStorage (mesmo padrão do
// clientesService; será trocada por API do ERP futuramente).
// Chave: 'precificaai:vendas'
// Assinaturas (export nomeado `vendasService`):
//   criar({ cliente, itens, total })
//     cliente: { id, nome, whatsapp }
//     itens:   [{ codigo_fabrica, descricao, preco_venda, reservaId }]
//     → venda { id, status:'enviado', criada_em, cliente, itens, total }
//   listar() → array (relê o storage a cada chamada, sem cache)
//   atualizarStatus(id, novoStatus) → venda atualizada; persiste
import { describe, it, expect, beforeEach } from 'vitest';
import { vendasService } from '../../src/services/vendas.js';

const KEY = 'precificaai:vendas';
const payload = {
  cliente: { id: 'c1', nome: 'Maria Silva', whatsapp: '5518999990001' },
  itens: [{ codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR', preco_venda: 89.9, reservaId: 'res-1' }],
  total: 89.9,
};

beforeEach(() => localStorage.clear());

describe('vendasService.criar', () => {
  it('cria com id, status enviado e criada_em', () => {
    const v = vendasService.criar(payload);
    expect(v.id).toBeTruthy();
    expect(v.status).toBe('enviado');
    expect(v.criada_em).toBeTruthy();
    expect(v.cliente.nome).toBe('Maria Silva');
    expect(v.itens[0].reservaId).toBe('res-1');
  });

  it('ids únicos e persistência na chave certa', () => {
    const a = vendasService.criar(payload);
    const b = vendasService.criar(payload);
    expect(a.id).not.toBe(b.id);
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(2);
  });
});

describe('vendasService.listar', () => {
  it('vazio com storage limpo', () => {
    expect(vendasService.listar()).toHaveLength(0);
  });

  it('relê do storage (sobrevive a reload)', () => {
    vendasService.criar(payload);
    const snap = localStorage.getItem(KEY);
    localStorage.clear();
    localStorage.setItem(KEY, snap);
    expect(vendasService.listar()).toHaveLength(1);
  });
});

describe('vendasService.atualizarStatus', () => {
  it('muda o status e persiste', () => {
    const v = vendasService.criar(payload);
    const atualizada = vendasService.atualizarStatus(v.id, 'pago');
    expect(atualizada.status).toBe('pago');
    expect(vendasService.listar().find((x) => x.id === v.id).status).toBe('pago');
  });
});
