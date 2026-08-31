import { useEffect, useState } from 'react';
import { artesService } from '../services/artes.js';

export default function ImportarLoteModal({ aberto, onFechar, onImportar }) {
  const [lotes, setLotes] = useState([]);

  useEffect(() => {
    if (aberto) {
      artesService.listarSessoes().then((dados) => {
        setLotes(dados || []);
      });
    }
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div role="dialog" className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Importar Lote</h2>
          <button onClick={onFechar} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {lotes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhum lote</p>
          ) : (
            <div className="space-y-2">
              {lotes.map(lote => {
                const total = lote.artes ? lote.artes.length : 0;
                const vinculadas = lote.artes ? lote.artes.filter(a => a.sku).length : 0;
                return (
                  <button
                    key={lote.id}
                    onClick={() => {
                      onImportar(lote);
                      onFechar();
                    }}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-700">{lote.nome}</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {vinculadas}/{total} vinculadas
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
