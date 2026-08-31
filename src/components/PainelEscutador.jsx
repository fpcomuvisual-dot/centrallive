import { useState } from 'react';
import { processarTranscricao } from '../services/escutador';

export default function PainelEscutador() {
  const [transcricao, setTranscricao] = useState('');
  const [processando, setProcessando] = useState(false);
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState('');
  const [novaAnotacao, setNovaAnotacao] = useState('');

  async function handleProcessar() {
    if (!transcricao.trim()) return;
    setProcessando(true);
    setErro('');
    try {
      const resultado = await processarTranscricao(transcricao);
      const comId = resultado.map(e => ({
        ...e,
        id: crypto.randomUUID(),
        noCarrinho: false,
        riscado: false
      }));
      setEventos(comId);
    } catch (e) {
      setErro('Erro ao processar. Verifique a chave do Gemini.');
    } finally {
      setProcessando(false);
    }
  }

  function toggleCarrinho(id) {
    setEventos(prev => prev.map(e => e.id === id ? { ...e, noCarrinho: !e.noCarrinho } : e));
  }

  function toggleRiscado(id, isRiscado) {
    setEventos(prev => prev.map(e => e.id === id ? { ...e, riscado: isRiscado } : e));
  }

  function handleAddAnotacao() {
    if (!novaAnotacao.trim()) return;
    setEventos(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        timestamp: '',
        cliente: 'Manual',
        acao: 'manual',
        descricao: novaAnotacao,
        noCarrinho: false,
        riscado: false
      }
    ]);
    setNovaAnotacao('');
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <span className="material-icons-outlined text-gray-500">headphones</span>
        <h2 className="font-bold text-gray-800">Escuta da Live</h2>
      </header>
      
      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full h-[120px] resize-y border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Cole a transcrição da live aqui..."
            value={transcricao}
            onChange={(e) => setTranscricao(e.target.value)}
          />
          <button
            onClick={handleProcessar}
            disabled={processando || !transcricao.trim()}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processando ? (
              <span className="material-icons-outlined animate-spin">sync</span>
            ) : (
              <span className="material-icons-outlined">auto_awesome</span>
            )}
            {processando ? 'Processando...' : 'Processar com Gemini'}
          </button>
          {erro && <p className="text-red-500 text-xs font-medium mt-1">{erro}</p>}
        </div>

        {eventos.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Checklist de Pedidos</h3>
            <div className="flex flex-col gap-3">
              {eventos.map((ev) => {
                const isPedido = ev.acao === 'pedido';
                const isCancelamento = ev.acao === 'cancelamento';
                const isManual = ev.acao === 'manual';

                let borderColor = 'border-gray-200';
                if (isPedido) borderColor = 'border-indigo-200';
                if (isCancelamento) borderColor = 'border-orange-200';
                if (isManual) borderColor = 'border-gray-300';

                return (
                  <div key={ev.id} className={`flex flex-col gap-2 p-3 rounded-lg border bg-white ${borderColor} ${ev.riscado ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center">
                        {ev.timestamp && <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{ev.timestamp}</span>}
                        <span className={`font-bold text-sm ${ev.riscado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {ev.cliente}
                        </span>
                        {isCancelamento && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase">Cancelamento</span>}
                        {isManual && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">Manual</span>}
                      </div>
                    </div>
                    
                    <p className={`text-sm ${ev.riscado ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {ev.descricao}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={() => toggleCarrinho(ev.id)}
                        className={`text-xs px-2 py-1 rounded-md border font-medium flex items-center gap-1 transition-colors ${ev.noCarrinho ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {ev.noCarrinho ? <span className="material-icons-outlined text-[14px]">check_circle</span> : <span className="material-icons-outlined text-[14px]">radio_button_unchecked</span>}
                        {ev.noCarrinho ? 'No carrinho' : 'Marcar carrinho'}
                      </button>
                      
                      {!ev.riscado ? (
                        <button 
                          onClick={() => toggleRiscado(ev.id, true)}
                          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 underline"
                        >
                          riscar
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleRiscado(ev.id, false)}
                          className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 underline"
                        >
                          desfazer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <hr className="border-gray-100 my-2" />
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-600">+ Anotação manual</label>
          <div className="flex gap-2">
            <input 
              type="text"
              value={novaAnotacao}
              onChange={(e) => setNovaAnotacao(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAnotacao()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
              placeholder="Ex: Luiza quer o anel"
            />
            <button 
              onClick={handleAddAnotacao}
              disabled={!novaAnotacao.trim()}
              className="bg-gray-800 text-white p-1.5 rounded-lg disabled:opacity-50 flex items-center justify-center"
            >
              <span className="material-icons-outlined">add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
