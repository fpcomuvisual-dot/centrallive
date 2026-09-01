import { erp } from './erp.js';

const STORAGE_KEY = 'precificaai:vendas';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(vendas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vendas));
}

export const vendasService = {
  /**
   * Cria uma nova venda vinculada à live com status inicial 'enviado'.
   * @param {{ cliente: object, itens: object[], total: number, live_id?: number, live_nome?: string }} dados
   * @returns venda com id, status, criada_em, live_id, live_nome
   */
  criar({ cliente, itens, total, live_id, live_nome }) {
    const vendas = load();
    const venda = {
      id: crypto.randomUUID(),
      status: 'enviado',
      criada_em: new Date().toISOString(),
      cliente,
      itens,
      total,
      live_id: live_id || null,
      live_nome: live_nome || 'Live Geral',
    };
    vendas.push(venda);
    save(vendas);

    // Persistir no banco de dados do ERP em background
    try {
      erp.salvarVenda({
        id: venda.id,
        cliente_id: cliente?.id || null,
        live_id: venda.live_id,
        live_nome: venda.live_nome,
        total: venda.total,
        itens: venda.itens,
        status: venda.status,
      }).catch(err => console.warn('Aviso: Venda salva localmente (sincronização de fundo):', err));
    } catch (e) {
      console.warn('Sincronização em background ignorada:', e);
    }

    return venda;
  },

  /** Relê do storage a cada chamada (sem cache em memória). */
  listar() {
    return load();
  },

  /** Atualiza o status de uma venda e persiste. */
  atualizarStatus(id, novoStatus) {
    const vendas = load();
    const idx = vendas.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error(`Venda ${id} não encontrada`);
    vendas[idx] = { ...vendas[idx], status: novoStatus };
    save(vendas);
    return vendas[idx];
  },

  /** Limpa todas as vendas do Kanban */
  limpar() {
    save([]);
  },

  /** Exclui uma venda específica */
  excluir(id) {
    const vendas = load().filter((v) => v.id !== id);
    save(vendas);
  },
};
