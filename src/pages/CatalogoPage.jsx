import { useState, useEffect } from 'react';
import { artesService } from '../services/artes.js';
import ArteCard from '../components/ArteCard.jsx';
import VincularSkuModal from '../components/VincularSkuModal.jsx';
import GerenciarVariacoesModal from '../components/GerenciarVariacoesModal.jsx';

export default function CatalogoPage() {
  const [sessoes, setSessoes] = useState(null);
  const [erro, setErro] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState({ aberto: false, arte: null, sessaoId: null, arteIndex: null });
  const [modalVariacoes, setModalVariacoes] = useState({ aberto: false, codigoFabrica: '', descricao: '' });

  const [selecoes, setSelecoes] = useState({});
  const [modoSelecao, setModoSelecao] = useState({});

  const getSelecionadas = (sessaoId) =>
    selecoes[sessaoId] || new Set();

  const toggleSelecao = (sessaoId, index) => {
    setSelecoes(prev => {
      const atual = new Set(prev[sessaoId] || []);
      if (atual.has(index)) atual.delete(index);
      else atual.add(index);
      return { ...prev, [sessaoId]: atual };
    });
  };

  const selecionarTudo = (sessaoId, total) => {
    const todos = new Set([...Array(total).keys()]);
    setSelecoes(prev => ({ ...prev, [sessaoId]: todos }));
  };

  const limparSelecao = (sessaoId) => {
    setSelecoes(prev => ({ ...prev, [sessaoId]: new Set() }));
    setModoSelecao(prev => ({ ...prev, [sessaoId]: false }));
  };

  const toggleModoSelecao = (sessaoId) => {
    setModoSelecao(prev => ({
      ...prev,
      [sessaoId]: !prev[sessaoId]
    }));
    if (modoSelecao[sessaoId]) {
      limparSelecao(sessaoId);
    }
  };

  const handleExcluirSelecionadas = async (sessao) => {
    const indices = [...getSelecionadas(sessao.id)];
    if (indices.length === 0) return;
    if (!confirm(`Excluir ${indices.length} foto(s) do lote?`)) return;
    await artesService.excluirArtes(sessao.id, indices);
    limparSelecao(sessao.id);
    artesService.listarSessoes().then(setSessoes).catch(() => {});
  };

  const handleAdicionarSelecionadasLive = (sessao) => {
    const indices = [...getSelecionadas(sessao.id)];
    if (indices.length === 0) return;
    const artesEscolhidas = indices.map(i => sessao.artes[i]);
    window.dispatchEvent(new CustomEvent(
      'precificaai:importar-artes',
      { detail: { artes: artesEscolhidas, nomeLote: sessao.nome } }
    ));
    limparSelecao(sessao.id);
    alert(`${artesEscolhidas.length} arte(s) enviadas para a live!`);
  };

  useEffect(() => {
    artesService
      .listarSessoes()
      .then(setSessoes)
      .catch(() => setErro(true));
  }, []);

  const toggleExpansao = (id) =>
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));

  const abrirModal = (arte, sessaoId, arteIndex) =>
    setModal({ aberto: true, arte, sessaoId, arteIndex });

  const fecharModal = () =>
    setModal({ aberto: false, arte: null, sessaoId: null, arteIndex: null });

  const abrirVariacoes = (arte) =>
    setModalVariacoes({ aberto: true, codigoFabrica: arte.sku, descricao: arte.nome });

  const fecharVariacoes = () =>
    setModalVariacoes((prev) => ({ ...prev, aberto: false }));

  const handleConfirmarVinculo = async (sku) => {
    await artesService.vincularSku(modal.sessaoId, modal.arteIndex, sku);
    fecharModal();
    artesService.listarSessoes().then(setSessoes).catch(() => {});
  };

  if (erro) return <p className="p-8 text-esgotado">Erro ao carregar os lotes.</p>;
  if (sessoes === null) return <p className="p-8 text-fraco">Carregando...</p>;
  if (sessoes.length === 0) return <p className="p-8 text-fraco">Nenhum lote encontrado.</p>;

  const termoBusca = busca.toLowerCase().trim();

  const sessoesFiltradas = termoBusca
    ? sessoes
        .map((s) => ({
          ...s,
          artes: s.artes.filter((a) => a.nome.toLowerCase().includes(termoBusca)),
        }))
        .filter((s) => s.artes.length > 0)
    : sessoes;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <input
        placeholder="Buscar arte"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full border border-[var(--borda-sutil)] rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
      />

      {sessoesFiltradas.map((sessao) => {
        const estaExpandido = termoBusca ? true : !!expandidos[sessao.id];
        return (
          <div key={sessao.id} className="rounded-[var(--card-radius)] overflow-hidden bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
            <button
              onClick={() => toggleExpansao(sessao.id)}
              className="w-full text-left px-4 py-3 font-semibold text-[var(--texto-forte)] hover:bg-[var(--fundo)] flex justify-between items-center"
            >
              <span>{sessao.nome}</span>
              <span className="text-xs text-[var(--texto-fraco)]">{sessao.artes.length} arte(s)</span>
            </button>

            {estaExpandido && (
              <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-b border-[var(--borda-sutil)]">
                <button
                  onClick={() => toggleModoSelecao(sessao.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                    modoSelecao[sessao.id]
                      ? 'bg-[#26415E] text-white border-[#26415E]'
                      : 'border-[var(--borda-sutil)] text-[var(--texto-fraco)]'
                  }`}
                >
                  {modoSelecao[sessao.id] ? 'Cancelar' : 'Selecionar'}
                </button>

                {modoSelecao[sessao.id] && (
                  <>
                    <button
                      onClick={() => selecionarTudo(sessao.id, sessao.artes.length)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border border-[var(--borda-sutil)] text-[var(--texto-fraco)] hover:border-[#26415E] hover:text-[#26415E] transition-colors"
                    >
                      Selecionar tudo ({sessao.artes.length})
                    </button>

                    {getSelecionadas(sessao.id).size > 0 && (
                      <>
                        <span className="text-xs text-[var(--texto-fraco)]">
                          {getSelecionadas(sessao.id).size} selecionada(s)
                        </span>

                        <button
                          onClick={() => handleAdicionarSelecionadasLive(sessao)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-[#4A9B7F] text-white hover:opacity-90 transition-opacity ml-auto"
                        >
                          + Adicionar à live
                        </button>

                        <button
                          onClick={() => handleExcluirSelecionadas(sessao)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium border border-[#C0526A] text-[#C0526A] hover:bg-[rgba(192,82,106,0.08)] transition-colors"
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {estaExpandido && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                {sessao.artes.map((arte, i) => {
                  const selecionada = getSelecionadas(sessao.id).has(i);
                  const emModoSelecao = modoSelecao[sessao.id];

                  return (
                    <div
                      key={i}
                      onClick={() => emModoSelecao && toggleSelecao(sessao.id, i)}
                      className={`relative rounded-[var(--card-radius)] overflow-hidden bg-white shadow-sm transition-all ${
                        emModoSelecao ? 'cursor-pointer' : ''
                      } ${selecionada ? 'ring-2 ring-[#C48CB3]' : ''}`}
                    >
                      {emModoSelecao && (
                        <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          selecionada
                            ? 'bg-[#C48CB3] border-[#C48CB3]'
                            : 'bg-white/80 border-white'
                        }`}>
                          {selecionada && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      )}

                      {selecionada && (
                        <div className="absolute inset-0 bg-[#C48CB3]/20 z-[5]" />
                      )}

                      <ArteCard
                        arte={arte}
                        onVincular={emModoSelecao ? null : (a) => abrirModal(a, sessao.id, i)}
                        onGerenciarVariacoes={emModoSelecao ? null : abrirVariacoes}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <VincularSkuModal
        aberto={modal.aberto}
        arte={modal.arte}
        onFechar={fecharModal}
        onVincular={handleConfirmarVinculo}
      />

      <GerenciarVariacoesModal
        aberto={modalVariacoes.aberto}
        codigoFabrica={modalVariacoes.codigoFabrica}
        descricao={modalVariacoes.descricao}
        onFechar={fecharVariacoes}
      />
    </div>
  );
}
