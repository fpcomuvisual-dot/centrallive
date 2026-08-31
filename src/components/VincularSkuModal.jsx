import { useState } from 'react';
import { erp, ErpOfflineError } from '../services/erp.js';

export default function VincularSkuModal({ aberto, arte, onFechar, onVincular }) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  if (!aberto) return null;

  const buscar = async () => {
    setErro(null);
    setCarregando(true);
    try {
      const res = await erp.buscarProdutos(termo);
      setResultados(res.data.resultados);
    } catch (e) {
      if (e instanceof ErpOfflineError) {
        setErro('ERP offline — tente novamente mais tarde.');
      } else {
        setErro('Erro inesperado na busca.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-card p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-semibold text-lg text-forte">{arte.nome}</h2>
          <button
            onClick={onFechar}
            className="text-fraco hover:text-forte text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            placeholder="Buscar produto"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={buscar}
            disabled={carregando}
            className="bg-gradiente-primario text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Buscar
          </button>
        </div>

        {erro && <p className="text-esgotado text-sm mb-3">{erro}</p>}

        {resultados !== null && resultados.length === 0 && (
          <p className="text-fraco text-sm">Nenhum resultado encontrado.</p>
        )}

        {resultados && resultados.length > 0 && (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {resultados.map((p) => (
              <li
                key={p.codigo_fabrica}
                onClick={() => onVincular(p.codigo_fabrica)}
                className="px-3 py-2 hover:bg-fundo cursor-pointer flex gap-3 items-center"
              >
                <span className="font-mono text-sm font-medium text-forte">{p.codigo_fabrica}</span>
                <span className="text-sm text-fraco">{p.descricao}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
