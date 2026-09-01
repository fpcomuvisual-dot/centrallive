import { useState } from 'react';
import { vendasService } from '../services/vendas.js';
import { erp, ErpOfflineError } from '../services/erp.js';
import { fecharVenda } from '../services/fechamento.js';

const COLUNAS = [
  { key: 'enviado', label: 'Enviado', proximoStatus: 'pago' },
  { key: 'pago', label: 'Pago', proximoStatus: 'separado' },
  { key: 'separado', label: 'Separado', proximoStatus: 'entregue' },
  { key: 'entregue', label: 'Entregue', proximoStatus: null },
];

function formatarBR(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function montarUrlWaMe(venda) {
  const nomeCompleto = (typeof venda.cliente === 'object' ? venda.cliente?.nome : null) || 'amiga';
  const primeiroNome = nomeCompleto.trim().split(' ')[0];
  const rawWa = (typeof venda.cliente === 'object' ? venda.cliente?.whatsapp : venda.cliente) || '';
  const whatsapp = rawWa.replace(/\D/g, '');

  let texto = `Oi ${primeiroNome}!\n\n`;
  texto += `amiga, vou fechar a sua compra da live de hoje tá?\n\n`;
  texto += `ficou assim:\n\n`;

  let totalOriginalCalculado = 0;
  if (venda.itens && venda.itens.length > 0) {
    venda.itens.forEach((item) => {
      const desc = item.descricao || 'Produto';
      const precoPago = item.preco_venda ?? item.preco ?? 0;
      const precoOriginal = item.preco_cheio ?? precoPago;
      totalOriginalCalculado += Number(precoOriginal);

      const temDesconto = precoOriginal && Number(precoOriginal) > Number(precoPago);
      if (temDesconto) {
        texto += `• ${desc} — (era R$ ${formatarBR(precoOriginal)}) por R$ ${formatarBR(precoPago)} 🔥\n`;
      } else {
        texto += `• ${desc} por R$ ${formatarBR(precoPago)}\n`;
      }
    });
  }

  const economiaTotal = totalOriginalCalculado - Number(venda.total || 0);
  const textoEconomia = economiaTotal > 0.05 ? ` (Você economizou R$ ${formatarBR(economiaTotal)}! 🎉)` : '';

  texto += `\nTotal: R$ ${formatarBR(venda.total)}${textoEconomia}\n\n`;
  texto += `Pix ou cartão?`;

  return `https://web.whatsapp.com/send?phone=${whatsapp}&text=${encodeURIComponent(texto)}`;
}

export default function KanbanPage() {
  const [vendas, setVendas] = useState(() => vendasService.listar());
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState({});
  const [vendaFotosModal, setVendaFotosModal] = useState(null);

  const handleAvancar = async (venda) => {
    setErro('');
    const coluna = COLUNAS.find((c) => c.key === venda.status);
    if (!coluna || !coluna.proximoStatus) return;

    if (venda.status === 'enviado') {
      try {
        for (const item of venda.itens) {
          await erp.confirmarReserva(item.reservaId);
        }
      } catch (err) {
        setErro(`Erro ao confirmar no ERP: ${err.message}`);
        return;
      }
    }

    const atualizada = vendasService.atualizarStatus(venda.id, coluna.proximoStatus);
    setVendas((prev) => prev.map((v) => (v.id === atualizada.id ? atualizada : v)));
  };

  const handleAbrirWhatsApp = (venda) => {
    const url = montarUrlWaMe(venda);
    window.open(url, '_blank');
  };

  const handleCopiarTexto = (venda) => {
    const nomeCompleto = (typeof venda.cliente === 'object' ? venda.cliente?.nome : null) || 'amiga';
    const primeiroNome = nomeCompleto.trim().split(' ')[0];

    let texto = `Oi ${primeiroNome}!\n\n`;
    texto += `amiga, vou fechar a sua compra da live de hoje tá?\n\n`;
    texto += `ficou assim:\n\n`;

    let totalOriginalCalculado = 0;
    if (venda.itens && venda.itens.length > 0) {
      venda.itens.forEach((item) => {
        const desc = item.descricao || 'Produto';
        const precoPago = item.preco_venda ?? item.preco ?? 0;
        const precoOriginal = item.preco_cheio ?? precoPago;
        totalOriginalCalculado += Number(precoOriginal);

        const temDesconto = precoOriginal && Number(precoOriginal) > Number(precoPago);
        if (temDesconto) {
          texto += `• ${desc} — (era R$ ${formatarBR(precoOriginal)}) por R$ ${formatarBR(precoPago)} 🔥\n`;
        } else {
          texto += `• ${desc} por R$ ${formatarBR(precoPago)}\n`;
        }
      });
    }

    const economiaTotal = totalOriginalCalculado - Number(venda.total || 0);
    const textoEconomia = economiaTotal > 0.05 ? ` (Você economizou R$ ${formatarBR(economiaTotal)}! 🎉)` : '';

    texto += `\nTotal: R$ ${formatarBR(venda.total)}${textoEconomia}\n\n`;
    texto += `Pix ou cartão?`;

    navigator.clipboard.writeText(texto);
    alert('Texto do pedido copiado para a área de transferência! É só colar (Ctrl+V) no WhatsApp Web!');
  };

  const handleDispararFotos = async (venda) => {
    setEnviando(prev => ({ ...prev, [venda.id]: true }));
    try {
      const res = await fecharVenda({
        cliente: venda.cliente,
        itens: venda.itens,
        total: venda.total,
      });
      if (res.enviadas === 0 && res.falhas > 0) {
        alert(`⚠️ Não foi possível enviar as mensagens pelo Evolution (${res.falhas} falhas). Verifique se o WhatsApp está conectado no Evolution ou use o botão 'Abrir no WhatsApp Web'!`);
      } else {
        alert(`✅ Fotos e resumo enviados com sucesso via WhatsApp! (${res.enviadas} enviadas${res.falhas > 0 ? `, ${res.falhas} falhas` : ''})`);
      }
    } catch (e) {
      alert(`Erro ao disparar fotos: ${e.message}`);
    } finally {
      setEnviando(prev => ({ ...prev, [venda.id]: false }));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-[var(--texto-forte)]">Kanban de Vendas</h2>

      {erro && (
        <p className="text-[var(--vermelho-esgotado)] text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </p>
      )}

      <div className="grid grid-cols-4 gap-4">
        {COLUNAS.map((coluna) => {
          const vendasColuna = vendas.filter((v) => v.status === coluna.key);
          const coresCard = { enviado: 'border-t-blue-400', pago: 'border-t-[var(--verde-disponivel)]', separado: 'border-t-purple-400', entregue: 'border-t-gray-400' };
          return (
            <div
              key={coluna.key}
              data-testid={`coluna-${coluna.key}`}
              className="bg-white/60 rounded-[var(--card-radius)] p-3 space-y-3 min-h-[200px] border border-[var(--borda-sutil)]"
            >
              <h3 className="text-sm font-semibold text-[var(--texto-forte)] uppercase tracking-wide">
                {coluna.label}
                <span className="ml-2 text-xs font-normal text-[var(--texto-fraco)]">
                  ({vendasColuna.length})
                </span>
              </h3>

              {vendasColuna.map((venda) => (
                <div
                  key={venda.id}
                  data-testid="card-venda"
                  className={`bg-[var(--card-bg)] rounded-[var(--card-radius)] p-3 shadow-[var(--card-shadow)] space-y-2 border border-[var(--borda-sutil)] border-t-4 ${coresCard[coluna.key]}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-[var(--texto-forte)]">
                      {(typeof venda.cliente === 'object' ? venda.cliente?.nome : venda.cliente) || 'Cliente'}
                    </p>
                    {venda.live_nome && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                        🎬 {venda.live_nome}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--roxo)] font-bold">
                    Total: R$ {formatarBR(venda.total)}
                  </p>
                  <p className="text-[11px] text-[var(--texto-fraco)]">
                    {new Date(venda.criada_em).toLocaleString('pt-BR')}
                  </p>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      onClick={() => handleAbrirWhatsApp(venda)}
                      className="text-xs bg-[var(--verde-disponivel)] text-white px-2 py-1.5 rounded-lg font-bold hover:opacity-90 shadow-sm flex items-center justify-center gap-1"
                    >
                      💬 Abrir no WhatsApp Web
                    </button>
                    <button
                      onClick={() => setVendaFotosModal(venda)}
                      className="text-xs border border-[#83A6CE] text-[#26415E] bg-[#F4F7FA] px-2 py-1.5 rounded-lg font-semibold hover:bg-[#E8EDF5] flex items-center justify-center gap-1"
                    >
                      🖼️ Ver Fotos dos Produtos ({venda.itens?.length || 0})
                    </button>
                    <button
                      onClick={() => handleCopiarTexto(venda)}
                      className="text-xs border border-[var(--borda-sutil)] text-[var(--texto-fraco)] bg-gray-50 px-2 py-1 rounded-lg font-medium hover:bg-gray-100 flex items-center justify-center gap-1"
                    >
                      📋 Copiar Texto do Pedido
                    </button>
                    <button
                      onClick={() => handleDispararFotos(venda)}
                      disabled={enviando[venda.id]}
                      className="text-xs border border-gray-300 text-gray-500 bg-white px-2 py-1 rounded-lg font-normal hover:bg-gray-50 flex items-center justify-center gap-1 disabled:opacity-50 mt-1"
                    >
                      {enviando[venda.id] ? '⏳ Enviando...' : '⚡ Disparar via Evolution (API)'}
                    </button>
                    {coluna.proximoStatus && (
                      <button
                        onClick={() => handleAvancar(venda)}
                        className="text-xs bg-[var(--gradiente-primario)] text-white px-2 py-1.5 rounded-lg font-medium hover:opacity-90 shadow-sm mt-1"
                      >
                        Avançar →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {vendaFotosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setVendaFotosModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--texto-forte)]">
                  Fotos da Compra: {(typeof vendaFotosModal.cliente === 'object' ? vendaFotosModal.cliente?.nome : vendaFotosModal.cliente) || 'Cliente'}
                </h3>
                <p className="text-xs text-[var(--texto-fraco)]">Clique na imagem para abrir em alta resolução</p>
              </div>
              <button onClick={() => setVendaFotosModal(null)} className="text-gray-400 font-bold hover:text-gray-700 text-lg px-2">✕</button>
            </div>

            <div className="space-y-3">
              {vendaFotosModal.itens?.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-xl">
                  {item.storage_url ? (
                    <a href={item.storage_url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={item.storage_url} alt={item.descricao} className="w-16 h-16 object-cover rounded-lg border hover:scale-105 transition-transform" />
                    </a>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-[10px] text-gray-500 shrink-0 text-center px-1">Sem foto</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-[var(--texto-forte)] truncate">{item.descricao || 'Produto'}</p>
                    <p className="text-xs font-semibold text-[var(--roxo)]">R$ {formatarBR(item.preco_venda ?? item.preco_cheio ?? item.preco ?? 0)}</p>
                    {item.storage_url && (
                      <a href={item.storage_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline font-medium inline-block mt-0.5">
                        🔗 Abrir Imagem Completa
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setVendaFotosModal(null)} className="w-full bg-[#26415E] text-white py-2 rounded-xl font-semibold text-xs">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
