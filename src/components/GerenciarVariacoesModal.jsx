import { useEffect, useState } from 'react';
import { erp } from '../services/erp.js';

function formatarPreco(valor) {
  return Number(valor ?? 0).toFixed(2).replace('.', ',');
}

export default function GerenciarVariacoesModal({ aberto, codigoFabrica, descricao, onFechar }) {
  const [variacoes, setVariacoes] = useState([]);
  const [atributo1, setAtributo1] = useState('');
  const [atributo2, setAtributo2] = useState('');
  const [atributo3, setAtributo3] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [erro, setErro] = useState('');

  const carregar = async () => {
    const res = await erp.listarVariacoes(codigoFabrica);
    if (res.ok) {
      setVariacoes(res.data.variacoes);
    }
  };

  useEffect(() => {
    if (aberto) {
      carregar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, codigoFabrica]);

  if (!aberto) return null;

  const handleAdicionar = async () => {
    if (!atributo1.trim()) {
      setErro('Atributo 1 é obrigatório');
      return;
    }
    setErro('');
    const res = await erp.criarVariacao(codigoFabrica, {
      atributo1,
      atributo2,
      atributo3,
      preco_venda: Number(preco),
      estoque: Number(estoque),
    });
    if (res.ok) {
      setAtributo1('');
      setAtributo2('');
      setAtributo3('');
      setPreco('');
      setEstoque('');
      await carregar();
    } else if (res.status === 409) {
      setErro('Essa combinação já existe.');
    }
  };

  return (
    <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-lg">Variações — {descricao}</h2>
          <button onClick={onFechar} className="text-gray-500 hover:text-gray-700 text-sm">
            Fechar
          </button>
        </div>

        {variacoes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma variação cadastrada.</p>
        ) : (
          <ul className="divide-y border rounded">
            {variacoes.map((v) => (
              <li key={v.id} className="px-3 py-2 text-sm flex justify-between gap-2">
                <span>{[v.atributo1, v.atributo2, v.atributo3].filter(Boolean).join(' / ')}</span>
                <span className="text-gray-600 whitespace-nowrap">
                  R$ {formatarPreco(v.preco_venda)} · {v.estoque} un.
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t pt-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Atributo 1"
              value={atributo1}
              onChange={(e) => setAtributo1(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Atributo 2"
              value={atributo2}
              onChange={(e) => setAtributo2(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Atributo 3"
              value={atributo3}
              onChange={(e) => setAtributo3(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Preço"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <input
              placeholder="Estoque"
              value={estoque}
              onChange={(e) => setEstoque(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <button
            onClick={handleAdicionar}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Adicionar variação
          </button>
        </div>
      </div>
    </div>
  );
}
