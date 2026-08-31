// src/components/WhatsappStatusBadge.jsx
// Badge permanente de conexão do WhatsApp — fica no header do App.
// - Checa evolution.verificarConexao() no mount e a cada 30 s
// - state 'open' → "WhatsApp conectado"
// - outro estado  → "desconectado" (role="alert") + clique abre QR
import { useEffect, useState, useCallback } from 'react';
import { evolution, EvolutionOfflineError } from '../services/evolution.js';

export default function WhatsappStatusBadge() {
  const [conectado, setConectado] = useState(null); // null = carregando
  const [qrSrc, setQrSrc] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  const verificar = useCallback(async () => {
    try {
      const res = await evolution.verificarConexao();
      setConectado(res.data?.instance?.state === 'open');
    } catch (err) {
      if (err instanceof EvolutionOfflineError) {
        setConectado(false);
      } else {
        setConectado(false);
      }
    }
  }, []);

  useEffect(() => {
    verificar();
    const intervalo = setInterval(verificar, 30_000);
    return () => clearInterval(intervalo);
  }, [verificar]);

  const handleClick = async () => {
    if (conectado) return;
    try {
      const res = await evolution.obterQrCode();
      setQrSrc(res.data?.base64 ?? null);
      setModalAberto(true);
    } catch {
      // silencia — fallback: mostra modal sem QR
      setModalAberto(true);
    }
  };

  if (conectado === null) {
    return (
      <span className="text-xs text-gray-400 px-2 py-1 rounded-full border">
        Verificando WhatsApp...
      </span>
    );
  }

  return (
    <>
      {conectado ? (
        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full border border-green-300">
          WhatsApp conectado
        </span>
      ) : (
        <span
          role="alert"
          onClick={handleClick}
          className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full border border-red-300 cursor-pointer hover:bg-red-200"
        >
          WhatsApp desconectado — clique para reconectar
        </span>
      )}

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-white rounded-lg p-6 shadow-xl max-w-xs w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold">Conectar WhatsApp</h2>
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="QR Code para conectar WhatsApp"
                className="w-full"
              />
            ) : (
              <p className="text-sm text-gray-500">Não foi possível carregar o QR Code.</p>
            )}
            <button
              onClick={() => setModalAberto(false)}
              className="text-xs text-gray-500 underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
