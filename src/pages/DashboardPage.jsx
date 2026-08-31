import React, { useState, useEffect } from 'react';
import { clientesService } from '../services/clientes.js';
import { vendasService } from '../services/vendas.js';
import { erp, ErpOfflineError } from '../services/erp.js';

export default function DashboardPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalProdutos, setTotalProdutos] = useState(null);
  const [totalVendido, setTotalVendido] = useState(0);
  const [ultimasVendas, setUltimasVendas] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [clientes, vendas] = await Promise.all([
          clientesService.listar(),
          vendasService.listar()
        ]);
        
        setTotalClientes(clientes.length);
        
        const sum = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
        setTotalVendido(sum);
        
        const sorted = [...vendas].sort((a, b) => new Date(b.criada_em) - new Date(a.criada_em));
        setUltimasVendas(sorted.slice(0, 3));
      } catch (err) {
        console.error('Erro ao carregar dashboard', err);
      }

      try {
        const prodRes = await erp.listarProdutos();
        if (prodRes.ok) {
          setTotalProdutos(prodRes.data.produtos.length);
        } else {
          setTotalProdutos('—');
        }
      } catch (err) {
        setTotalProdutos('—');
      }

      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  const formatarMoeda = (valor) => {
    return valor.toFixed(2).replace('.', ',');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--texto-forte)]">Central de Vendas</h1>
        <p className="text-[var(--texto-fraco)] mt-2">Visão geral do seu negócio e atalhos rápidos.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--borda-sutil)] flex flex-col justify-between">
          <h3 className="text-[var(--texto-fraco)] font-medium text-sm uppercase tracking-wider mb-2">Clientes</h3>
          <p className="text-4xl font-bold text-[var(--texto-forte)]">{totalClientes}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--borda-sutil)] flex flex-col justify-between">
          <h3 className="text-[var(--texto-fraco)] font-medium text-sm uppercase tracking-wider mb-2">Produtos</h3>
          <p className="text-4xl font-bold text-[var(--texto-forte)]">{totalProdutos === null ? '—' : totalProdutos}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--borda-sutil)] flex flex-col justify-between">
          <h3 className="text-[var(--texto-fraco)] font-medium text-sm uppercase tracking-wider mb-2">Total Vendido</h3>
          <p className="text-4xl font-bold text-[var(--rosa)]">R$ {formatarMoeda(totalVendido)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-[var(--borda-sutil)] overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--borda-sutil)]">
              <h3 className="text-lg font-semibold text-[var(--texto-forte)]">Últimas vendas</h3>
            </div>
            <div className="p-0">
              {ultimasVendas.length === 0 ? (
                <div className="p-8 text-center text-[var(--texto-fraco)]">Nenhuma venda</div>
              ) : (
                <ul data-testid="ultimas-vendas" className="divide-y divide-[var(--borda-sutil)]">
                  {ultimasVendas.map(v => (
                    <li key={v.id} data-testid="venda-recente-item" className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[rgba(236,72,153,0.1)] text-[var(--rosa)] flex items-center justify-center font-bold">
                          {v.cliente?.nome?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--texto-forte)]">{v.cliente?.nome}</span>
                      </div>
                      <span className="font-bold text-[var(--texto-forte)]">R$ {formatarMoeda(v.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-[var(--texto-forte)] mb-2">Ações Rápidas</h3>
          <button 
            onClick={() => onNavigate('live')}
            className="w-full bg-[var(--rosa)] hover:bg-pink-600 text-white font-semibold py-4 px-6 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🎥</span> Iniciar Live
          </button>
          <button 
            onClick={() => onNavigate('catalogo')}
            className="w-full bg-white hover:bg-gray-50 border border-[var(--borda-sutil)] text-[var(--texto-forte)] font-medium py-4 px-6 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🗂️</span> Ir pra Catálogo
          </button>
          <button 
            onClick={() => onNavigate('kanban')}
            className="w-full bg-white hover:bg-gray-50 border border-[var(--borda-sutil)] text-[var(--texto-forte)] font-medium py-4 px-6 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📋</span> Ver Kanban
          </button>
        </div>
      </div>
    </div>
  );
}
