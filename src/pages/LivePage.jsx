import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { erp } from '../services/erp.js';
import { clientesService } from '../services/clientes.js';
import { fecharVenda } from '../services/fechamento.js';
import { vendasService } from '../services/vendas.js';
import { artesService } from '../services/artes.js';
import {
  estadoInicial,
  abrirCarrinho,
  adicionarItem,
  removerItem,
  fecharCarrinho,
  marcarEnviado,
  totalDoCarrinho,
} from '../services/carrinhos.js';
import ImportarLoteModal from '../components/ImportarLoteModal.jsx';
import PainelEscutador from '../components/PainelEscutador.jsx';

const LIVE_KEY = 'precificaai:liveAtiva';

function formatarPreco(valor) {
  return Number(valor ?? 0).toFixed(2).replace('.', ',');
}

export function resolverDropMulti({ dragData, dropTargetId }) {
  if (!dropTargetId || !dropTargetId.startsWith('carrinho-') || !dragData) {
    return { acao: 'nada' };
  }
  const clienteId = dropTargetId.replace('carrinho-', '');
  if (dragData.tipo === 'variacao') {
    return {
      acao: 'reservar',
      clienteId,
      payload: {
        codigo_fabrica: dragData.codigo_fabrica,
        variacao_id: dragData.variacao_id,
        cliente_ref: clienteId,
        ttl_minutos: 30,
      },
    };
  }
  return {
    acao: 'reservar',
    clienteId,
    payload: {
      codigo_fabrica: dragData.codigo_fabrica,
      cliente_ref: clienteId,
      ttl_minutos: 30,
    },
  };
}

export let __test__handleDropResolvido = null;

function DraggableProduto({ item, disabled, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `produto-${item.codigo_fabrica}`,
    data: { tipo: 'produto', codigo_fabrica: item.codigo_fabrica },
    disabled,
  });
  if (disabled) {
    return (
      <div className="flex flex-col h-full opacity-50">
        {children}
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      data-testid="draggable-produto"
      {...listeners}
      {...attributes}
      role={undefined}
      aria-roledescription={undefined}
      className={`flex flex-col h-full touch-none ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}`}
    >
      {children}
    </div>
  );
}

function DraggableVariacao({ item, variacao, disabled, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `variacao-${item.codigo_fabrica}-${variacao.id}`,
    data: { tipo: 'variacao', codigo_fabrica: item.codigo_fabrica, variacao_id: variacao.id },
    disabled,
  });
  if (disabled) {
    return (
      <div className="flex-1 opacity-50">
        {children}
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      data-testid="draggable-variacao"
      {...listeners}
      {...attributes}
      role={undefined}
      aria-roledescription={undefined}
      className={`flex-1 touch-none cursor-grab ${isDragging ? 'opacity-40' : ''}`}
    >
      {children}
    </div>
  );
}

function DropzoneCarrinhoCard({ carrinho, children }) {
  const isAberto = carrinho.status === 'aberto';
  const { setNodeRef, isOver } = useDroppable({
    id: `carrinho-${carrinho.clienteId}`,
    disabled: !isAberto,
  });
  return (
    <div
      ref={setNodeRef}
      data-testid="carrinho-card"
      data-cliente-id={carrinho.clienteId}
      className={`bg-white rounded-xl border border-[#E8EDF5] shadow-[0_1px_4px_rgba(13,30,76,0.07)] p-4 flex flex-col gap-3 transition-colors ${
        isOver && isAberto ? 'ring-2 ring-[#C48CB3] bg-[#F4F7FA]' : ''
      }`}
    >
      {isAberto && <div data-testid="dropzone-carrinho-card" className="hidden" />}
      {children}
    </div>
  );
}

export default function LivePage() {
  const [liveAtiva, setLiveAtiva] = useState(() => {
    const raw = localStorage.getItem(LIVE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [nomeLiveInput, setNomeLiveInput] = useState('');

  const [catalogo, setCatalogo] = useState([]);
  const [imagensProduto, setImagensProduto] = useState({});
  const [codigoNovoItem, setCodigoNovoItem] = useState('');
  const [quantidadeNovoItem, setQuantidadeNovoItem] = useState('');
  const [termoProduto, setTermoProduto] = useState('');

  const [estadoCarrinhos, setEstadoCarrinhos] = useState(estadoInicial());
  const [mostrarNovoCarrinho, setMostrarNovoCarrinho] = useState(false);
  const [termoCliente, setTermoCliente] = useState('');
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [termoBuscaCarrinho, setTermoBuscaCarrinho] = useState('');

  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteWhatsapp, setNovoClienteWhatsapp] = useState('');

  const [avisoEsgotado, setAvisoEsgotado] = useState('');
  const [statusFechamento, setStatusFechamento] = useState({});
  const [variacoesExpandidas, setVariacoesExpandidas] = useState({});

  const [showImportarModal, setShowImportarModal] = useState(false);
  const [resumoImportacao, setResumoImportacao] = useState('');

  const [showFormManual, setShowFormManual] = useState(false);
  const [nomeManual, setNomeManual] = useState('');
  const [precoManual, setPrecoManual] = useState('');
  const [qtdManual, setQtdManual] = useState('1');

  const [descontoLive, setDescontoLive] = useState(0);
  const [itemArrastando, setItemArrastando] = useState(null);

  function calcularPrecos(precoOriginal) {
    if (!descontoLive || descontoLive === 0) {
      return {
        cheio: precoOriginal,
        pix: precoOriginal,
        cartao: precoOriginal,
        temDesconto: false,
      };
    }
    const pix = precoOriginal * (1 - descontoLive / 100);
    const cartao = pix * 1.10; // +10% no cartão
    return {
      cheio: precoOriginal,
      pix,
      cartao,
      temDesconto: true,
    };
  }

  const handleAdicionarManual = () => {
    if (!nomeManual.trim() || !precoManual.trim()) return;
    const preco = parseFloat(
      precoManual.replace(/[^\d,]/g, '').replace(',', '.')
    ) || 0;
    const qtd = parseInt(qtdManual, 10) || 1;
    const novasPecas = {
      codigo_fabrica: `MANUAL-${crypto.randomUUID().slice(0, 8)}`,
      descricao: nomeManual.trim(),
      preco_venda: preco,
      estoque_disponivel: qtd,
      storage_url: null,
    };
    setCatalogo(prev => [novasPecas, ...prev]);
    setNomeManual('');
    setPrecoManual('');
    setQtdManual('1');
    setShowFormManual(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const carregarCatalogo = async (liveId) => {
    try {
      const res = await erp.catalogoLive(liveId);
      if (res.ok && res.data?.itens?.length > 0) {
        setCatalogo(res.data.itens);
      }
      // Se falhar ou retornar vazio: mantém catálogo atual
    } catch {
      // ERP offline: mantém catálogo atual
    }
  };

  useEffect(() => {
    if (liveAtiva) {
      carregarCatalogo(liveAtiva.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAtiva?.id]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('precificaai:live-ativa', { detail: liveAtiva }));
  }, [liveAtiva]);

  useEffect(() => {
    const totalItens = estadoCarrinhos.carrinhos.reduce((acc, c) => acc + c.itens.length, 0);
    window.dispatchEvent(new CustomEvent('precificaai:carrinho-count', { detail: totalItens }));
  }, [estadoCarrinhos]);



  useEffect(() => {
    const onImportarArtes = (e) => {
      const { artes, nomeLote } = e.detail;
      const novosItens = artes.map((arte) => ({
        codigo_fabrica: arte.sku || `LOTE-${crypto.randomUUID().slice(0,8)}`,
        descricao: arte.nome,
        preco_venda: parseFloat(
          String(arte.preco || '0')
            .replace(/[^\d,]/g, '')
            .replace(',', '.')
        ) || 0,
        estoque_disponivel: arte.quantidade || 1,
        storage_url: arte.storage_url || null,
      }));

      setCatalogo(prev => {
        const existentes = new Set(prev.map(i => i.codigo_fabrica));
        const novos = novosItens.filter(
          i => !existentes.has(i.codigo_fabrica)
        );
        return [...prev, ...novos];
      });

      setResumoImportacao(
        `${novosItens.length} itens de "${nomeLote}" adicionados`
      );
      setTimeout(() => setResumoImportacao(''), 5000);
    };

    window.addEventListener('precificaai:importar-artes', onImportarArtes);
    return () => window.removeEventListener(
      'precificaai:importar-artes', onImportarArtes
    );
  }, []);

  useEffect(() => {
    let cancelado = false;
    catalogo.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(imagensProduto, item.codigo_fabrica)) return;
      artesService
        .buscarImagemPorSku(item.codigo_fabrica)
        .then((url) => {
          if (!cancelado) setImagensProduto((prev) => ({ ...prev, [item.codigo_fabrica]: url }));
        })
        .catch(() => {
          if (!cancelado) setImagensProduto((prev) => ({ ...prev, [item.codigo_fabrica]: null }));
        });
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo]);

  const handleIniciarLive = async () => {
    if (!nomeLiveInput.trim()) return;
    const nomeLimpo = nomeLiveInput.trim();
    try {
      const res = await erp.criarLive({ nome: nomeLimpo });
      if (res.ok && res.data) {
        const nova = { id: res.data.id, nome: res.data.nome || nomeLimpo, iniciada_em: new Date().toISOString() };
        localStorage.setItem(LIVE_KEY, JSON.stringify(nova));
        setLiveAtiva(nova);
      } else {
        const nova = { id: Date.now(), nome: nomeLimpo, iniciada_em: new Date().toISOString() };
        localStorage.setItem(LIVE_KEY, JSON.stringify(nova));
        setLiveAtiva(nova);
      }
    } catch {
      const nova = { id: Date.now(), nome: nomeLimpo, iniciada_em: new Date().toISOString() };
      localStorage.setItem(LIVE_KEY, JSON.stringify(nova));
      setLiveAtiva(nova);
    }
  };

  const handleAdicionarItem = async (e) => {
    if (e) e.preventDefault();
    if (!codigoNovoItem.trim()) {
      setAvisoEsgotado('Digite o código do produto.');
      return;
    }
    const qtdeStr = quantidadeNovoItem.trim() || '1';
    const qtde = parseInt(qtdeStr, 10);
    if (isNaN(qtde) || qtde <= 0) {
      setAvisoEsgotado('Quantidade inválida.');
      return;
    }

    const res = await erp.adicionarItemLive(liveAtiva.id, {
      codigo_fabrica: codigoNovoItem,
      quantidade_destinada: qtde,
    });
    if (res.ok) {
      setCodigoNovoItem('');
      setQuantidadeNovoItem('');
      setAvisoEsgotado('');
      await carregarCatalogo(liveAtiva.id);
    } else {
      if (res.status === 404) setAvisoEsgotado('Produto não encontrado no ERP.');
      else if (res.status === 422) setAvisoEsgotado('Quantidade maior que o estoque disponível.');
      else setAvisoEsgotado('Erro ao adicionar produto.');
    }
  };

  const handleImportarLote = async (lote) => {
    const artes = lote.artes || [];
    if (artes.length === 0) return;

    const novosItens = artes.map((arte) => ({
      codigo_fabrica: arte.sku || arte.nome,
      descricao: arte.nome,
      preco_venda: parseFloat(
        String(arte.preco || '0')
          .replace(/[^\d,]/g, '')
          .replace(',', '.')
      ) || 0,
      estoque_disponivel: arte.quantidade || 1,
      storage_url: arte.storage_url || null,
    }));

    setCatalogo((prev) => {
      const codigosExistentes = new Set(prev.map((i) => i.codigo_fabrica));
      const semDuplicata = novosItens.filter(
        (i) => !codigosExistentes.has(i.codigo_fabrica)
      );
      return [...prev, ...semDuplicata];
    });

    setResumoImportacao(`${novosItens.length} itens importados do lote`);
    setTimeout(() => setResumoImportacao(''), 5000);
  };

  const handleBuscarCliente = (e) => {
    setTermoCliente(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (termoCliente.trim() === '') {
        setResultadosClientes([]);
      } else {
        try {
          const res = await clientesService.buscar(termoCliente);
          setResultadosClientes(res || []);
        } catch (e) {
          // ignore
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [termoCliente]);

  const selecionarClienteParaCarrinho = (cliente) => {
    // Garantir que cliente.id existe — alguns endpoints retornam
    // o objeto aninhado diferente
    const clienteNormalizado = {
      ...cliente,
      id: String(cliente.id ?? cliente.cliente_id ?? crypto.randomUUID()),
    };
    setEstadoCarrinhos(s => abrirCarrinho(s, clienteNormalizado));
    setMostrarNovoCarrinho(false);
    setTermoCliente('');
    setResultadosClientes([]);
  };

  const handleCadastrarAbrirCarrinho = async () => {
    if (!novoClienteNome.trim() || !novoClienteWhatsapp.trim()) return;
    try {
      const clienteRetornado = await clientesService.criar({
        nome: novoClienteNome,
        whatsapp: novoClienteWhatsapp
      });
      const clienteNormalizado = {
        ...clienteRetornado,
        id: String(
          clienteRetornado.id ??
            clienteRetornado.cliente_id ??
            crypto.randomUUID()
        ),
        nome: clienteRetornado.nome || novoClienteNome,
        whatsapp: clienteRetornado.whatsapp || novoClienteWhatsapp,
      };
      setEstadoCarrinhos(s => abrirCarrinho(s, clienteNormalizado));
      setMostrarNovoCarrinho(false);
      setNovoClienteNome('');
      setNovoClienteWhatsapp('');
      setTermoCliente('');
      setResultadosClientes([]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleVariacoes = (codigoFabrica) => {
    setVariacoesExpandidas((prev) => ({ ...prev, [codigoFabrica]: !prev[codigoFabrica] }));
  };

  const executarReserva = async (clienteId, item, variacao) => {
    const precoBase = variacao ? variacao.preco_venda : item.preco_venda;
    const precos = calcularPrecos(precoBase);
    
    let desc = item.descricao;
    if (variacao) {
      const vLabel = [variacao.atributo1, variacao.atributo2, variacao.atributo3].filter(Boolean).join(' / ');
      if (vLabel) desc += ' — ' + vLabel;
    }

    const cartItem = {
      reservaId: crypto.randomUUID(),
      codigo_fabrica: item.codigo_fabrica,
      descricao: desc,
      preco_venda: precos.pix,
      preco_cheio: precos.cheio,
      preco_cartao: precos.cartao,
    };

    const payload = {
      codigo_fabrica: item.codigo_fabrica,
      cliente_ref: clienteId,
      ttl_minutos: 30,
    };
    if (variacao) payload.variacao_id = variacao.id;

    try {
      const res = await erp.criarReserva(liveAtiva.id, payload);
      if (res.ok) {
        cartItem.reservaId = res.data.id;
      } else if (res.status === 409) {
        setAvisoEsgotado('Estoque esgotado, tente novamente.');
        return;
      }
    } catch {
      // ERP offline → continua sem ERP
    }

    // Verificar se carrinho existe antes de adicionar
    const carrinhoExiste = estadoCarrinhos.carrinhos.some(
      c => c.clienteId === clienteId
    );
    if (!carrinhoExiste) {
      console.error('clienteId não encontrado:', clienteId,
        'carrinhos:', estadoCarrinhos.carrinhos.map(c => c.clienteId));
      setAvisoEsgotado('Erro interno: carrinho não encontrado.');
      return;
    }

    setAvisoEsgotado('');
    setEstadoCarrinhos(s => adicionarItem(s, clienteId, cartItem));
  };

  useEffect(() => {
    __test__handleDropResolvido = async ({ dragData, dropTargetId }) => {
      const resultado = resolverDropMulti({ dragData, dropTargetId });
      if (resultado.acao === 'nada') return;

      if (resultado.acao === 'reservar') {
        const item = catalogo.find((i) => i.codigo_fabrica === resultado.payload.codigo_fabrica);
        if (!item) return;
        
        let variacao = null;
        if (resultado.payload.variacao_id !== undefined) {
          variacao = (item.variacoes || []).find((v) => v.id === resultado.payload.variacao_id);
          if (!variacao) return;
        }
        
        await executarReserva(resultado.clienteId, item, variacao);
      }
    };
  }); // roda a cada render para atualizar closures

  const handleDragStart = ({ active }) => {
    const item = catalogo.find(i =>
      `produto-${i.codigo_fabrica}` === active.id ||
      active.id.startsWith(`variacao-${i.codigo_fabrica}-`)
    );
    setItemArrastando(item || null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setItemArrastando(null);
    if (__test__handleDropResolvido) {
      await __test__handleDropResolvido({
        dragData: active?.data?.current,
        dropTargetId: over?.id ?? null,
      });
    }
  };

  const handleRemover = async (clienteId, reservaId, itemIndex) => {
    if (reservaId) {
      try {
        await erp.removerReserva(reservaId);
      } catch (err) {
        console.warn('Remoção de reserva ignorada no ERP:', err);
      }
    }
    setEstadoCarrinhos(s => removerItem(s, clienteId, reservaId, itemIndex));
  };

  const handleFecharCarrinho = (clienteId) => {
    setEstadoCarrinhos(s => fecharCarrinho(s, clienteId));
  };

  const [historicoLives, setHistoricoLives] = useState([]);

  const carregarHistoricoLives = async () => {
    try {
      const res = await erp.listarLives();
      if (res.ok && res.data?.lives) {
        setHistoricoLives(res.data.lives);
      }
    } catch (e) {
      console.warn('Erro ao listar histórico de lives:', e);
    }
  };

  useEffect(() => {
    if (!liveAtiva) {
      carregarHistoricoLives();
    }
  }, [liveAtiva]);

  const handleEncerrarLive = async () => {
    if (!window.confirm(`Deseja realmente encerrar a live "${liveAtiva?.nome}"? O histórico e as vendas serão salvos com sucesso.`)) return;
    try {
      if (liveAtiva?.id) {
        await erp.encerrarLive(liveAtiva.id);
      }
    } catch (err) {
      console.warn('Encerramento salvo localmente:', err);
    }
    localStorage.removeItem(LIVE_KEY);
    setLiveAtiva(null);
    carregarHistoricoLives();
  };

  const handleSelecionarLive = (live) => {
    const ativa = {
      id: live.id,
      nome: live.nome,
      iniciada_em: live.criada_em || new Date().toISOString(),
    };
    localStorage.setItem(LIVE_KEY, JSON.stringify(ativa));
    setLiveAtiva(ativa);
  };

  const handleEnviarVenda = async (carrinho) => {
    setStatusFechamento(s => ({ ...s, [carrinho.clienteId]: 'enviando' }));
    const total = totalDoCarrinho(carrinho);
    
    // fecharVenda sem reservaId
    const itens = carrinho.itens.map(i => ({
      codigo_fabrica: i.codigo_fabrica,
      descricao: i.descricao,
      preco_venda: i.preco_venda,
      preco_cheio: i.preco_cheio,
      preco_cartao: i.preco_cartao,
      storage_url: i.storage_url
    }));
    
    const resultado = await fecharVenda({ cliente: carrinho.cliente, itens, total });
    
    setStatusFechamento(s => ({ ...s, [carrinho.clienteId]: resultado }));
    
    vendasService.criar({
      cliente: carrinho.cliente,
      itens: carrinho.itens, // com reservaId
      total,
      live_id: liveAtiva?.id || null,
      live_nome: liveAtiva?.nome || 'Live Geral',
    });
    
    setEstadoCarrinhos(s => marcarEnviado(s, carrinho.clienteId));
  };

  const catalogoFiltrado = catalogo.filter(i => 
    !termoProduto || 
    i.descricao.toLowerCase().includes(termoProduto.toLowerCase()) ||
    i.codigo_fabrica.toLowerCase().includes(termoProduto.toLowerCase())
  );

  const carrinhosVisiveis = estadoCarrinhos.carrinhos.filter(c =>
    !termoBuscaCarrinho || 
    c.cliente.nome.toLowerCase().includes(termoBuscaCarrinho.toLowerCase())
  );

  if (!liveAtiva) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-[var(--card-radius)] shadow-[var(--card-shadow)] p-6 space-y-4 border border-[var(--borda-sutil)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            <h2 className="text-xl font-bold text-[var(--texto-forte)]">🎬 Iniciar uma Nova Live</h2>
          </div>
          <p className="text-sm text-[var(--texto-fraco)]">
            Digite o nome ou data da Live para iniciar e vincular automaticamente todas as vendas a esta transmissão:
          </p>
          <div className="flex gap-3">
            <input
              placeholder="Ex: Live 30/08 Vivi, Live Coleção Primavera..."
              value={nomeLiveInput}
              onChange={(e) => setNomeLiveInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleIniciarLive()}
              className="border border-[var(--borda-sutil)] rounded-xl px-4 py-2.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
            />
            <button
              onClick={handleIniciarLive}
              style={{ background: '#26415E' }}
              className="text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all shadow-md shrink-0"
            >
              Iniciar Live 🚀
            </button>
          </div>
        </div>

        {/* HISTÓRICO DE TODAS AS LIVES */}
        <div className="bg-white rounded-[var(--card-radius)] shadow-[var(--card-shadow)] p-6 space-y-4 border border-[var(--borda-sutil)]">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-base font-bold text-[var(--texto-forte)] flex items-center gap-2">
              📜 Histórico de Lives Anteriores ({historicoLives.length})
            </h3>
            <button
              onClick={carregarHistoricoLives}
              className="text-xs text-[#26415E] hover:underline font-semibold"
            >
              🔄 Atualizar Histórico
            </button>
          </div>

          {historicoLives.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center italic">Nenhuma live registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-[var(--texto-fraco)] uppercase tracking-wider">
                    <th className="pb-2 font-semibold">ID / Nome da Live</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Data de Criação</th>
                    <th className="pb-2 font-semibold text-center">Pedidos</th>
                    <th className="pb-2 font-semibold text-right">Faturamento Total</th>
                    <th className="pb-2 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historicoLives.map((live) => (
                    <tr key={live.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 font-semibold text-[var(--texto-forte)]">
                        #{live.id} — {live.nome}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          live.status === 'aberta' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {live.status === 'aberta' ? '🟢 Aberta' : 'Encerrada'}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-[var(--texto-fraco)]">
                        {live.criada_em ? new Date(live.criada_em).toLocaleString('pt-BR') : 'Data recente'}
                      </td>
                      <td className="py-3 text-xs text-center font-bold text-[var(--texto-forte)]">
                        {live.total_pedidos || 0}
                      </td>
                      <td className="py-3 text-xs text-right font-bold text-[var(--roxo)]">
                        R$ {Number(live.total_faturado || 0).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleSelecionarLive(live)}
                          className="text-xs bg-[#26415E] text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-90 shadow-sm"
                        >
                          Abrir Live →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* HEADER GLOBAL */}
      <div className="flex items-center justify-between px-4 bg-white border-b border-[var(--borda-sutil)] shrink-0 z-10" style={{ height: '48px' }}>
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          <span className="font-bold text-[var(--texto-forte)] text-sm">
            🔴 AO VIVO: #{liveAtiva.id} — {liveAtiva.nome}
          </span>
        </div>
        <button
          onClick={handleEncerrarLive}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-[#C0526A] text-[#C0526A] hover:bg-[rgba(192,82,106,0.08)] transition-colors shadow-sm"
        >
          Encerrar Live ⏹️
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: '30fr 40fr 30fr', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
          
          {/* COLUNA 1: PRODUTOS (30%) */}
          <div className="h-full overflow-y-auto p-4 border-r border-[var(--borda-sutil)] flex flex-col bg-[var(--fundo)]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-bold text-[var(--texto-forte)]">Catálogo</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[var(--texto-fraco)] font-medium">
                  Desconto:
                </span>
                {[0, 40, 50, 60].map(d => (
                  <button
                    key={d}
                    onClick={() => setDescontoLive(d)}
                    className={
                      descontoLive === d
                        ? 'text-xs px-3 py-1 rounded-full font-medium bg-[#C48CB3] text-white border-[#C48CB3]'
                        : 'text-xs px-3 py-1 rounded-full font-medium border border-[#E8EDF5] text-[#83A6CE] bg-transparent hover:border-[#C48CB3] hover:text-[#C48CB3] transition-colors'
                    }
                  >
                    {d === 0 ? 'Sem desconto' : `${d}%`}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mb-4 shrink-0 flex flex-col gap-3">
              <form onSubmit={handleAdicionarItem} className="flex gap-2">
                <input
                  placeholder="Código"
                  value={codigoNovoItem}
                  onChange={(e) => setCodigoNovoItem(e.target.value)}
                  className="border border-[var(--borda-sutil)] rounded-lg px-2 py-1 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
                />
                <input
                  placeholder="Quantidade"
                  value={quantidadeNovoItem}
                  onChange={(e) => setQuantidadeNovoItem(e.target.value)}
                  className="border border-[var(--borda-sutil)] rounded-lg px-2 py-1 text-sm w-12 focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
                />
                <button
                  type="submit"
                  aria-label="Adicionar à live"
                  style={{ background: '#26415E' }}
                  className="text-white px-3 py-1 rounded-lg text-sm font-medium hover:opacity-90"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportarModal(true)}
                  style={{ background: '#26415E' }}
                  className="text-white px-3 py-1 rounded-lg text-sm font-medium hover:opacity-90 whitespace-nowrap ml-auto"
                >
                  Importar Lote
                </button>
              </form>

              <button
                onClick={() => setShowFormManual(v => !v)}
                className="w-full border border-[#26415E] text-[#26415E] py-1.5 rounded-lg text-sm font-medium hover:bg-[#26415E] hover:text-white transition-colors"
              >
                + Peça manual
              </button>

              {showFormManual && (
                <div className="bg-white border border-[var(--borda-sutil)]
                                rounded-lg p-3 space-y-2 shrink-0">
                  <input
                    placeholder="Nome da peça"
                    value={nomeManual}
                    onChange={e => setNomeManual(e.target.value)}
                    className="border border-[var(--borda-sutil)] rounded-lg
                               px-3 py-1.5 text-sm w-full focus:outline-none
                               focus:ring-2 focus:ring-[var(--roxo)]"
                  />
                  <div className="flex gap-2">
                    <input
                      placeholder="Preço (ex: 79,90)"
                      value={precoManual}
                      onChange={e => setPrecoManual(e.target.value)}
                      className="border border-[var(--borda-sutil)] rounded-lg
                                 px-3 py-1.5 text-sm flex-1 focus:outline-none
                                 focus:ring-2 focus:ring-[var(--roxo)]"
                    />
                    <input
                      placeholder="Qtd"
                      value={qtdManual}
                      onChange={e => setQtdManual(e.target.value)}
                      className="border border-[var(--borda-sutil)] rounded-lg
                                 px-3 py-1.5 text-sm w-16 focus:outline-none
                                 focus:ring-2 focus:ring-[var(--roxo)]"
                    />
                  </div>
                  <button
                    onClick={handleAdicionarManual}
                    disabled={!nomeManual.trim() || !precoManual.trim()}
                    style={{ background: '#26415E' }}
                    className="w-full text-white text-sm py-1.5 rounded-lg hover:opacity-90 font-medium disabled:opacity-40"
                  >
                    Adicionar ao catálogo
                  </button>
                </div>
              )}

              <input
                placeholder="Buscar produto"
                value={termoProduto}
                onChange={(e) => setTermoProduto(e.target.value)}
                className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
              />
            </div>

            {avisoEsgotado && (
              <p className="text-[var(--vermelho-esgotado)] text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3 shrink-0">
                {avisoEsgotado}
              </p>
            )}
            {resumoImportacao && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3 shrink-0">
                {resumoImportacao}
              </p>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-10">
              {catalogoFiltrado.map((item) => {
                const temVariacoes = Array.isArray(item.variacoes) && item.variacoes.length > 0;
                const imagem = item.storage_url || imagensProduto[item.codigo_fabrica] || null;

                const conteudoLinha = (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 shrink-0 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {imagem ? (
                        <img src={imagem} alt={item.descricao} className="w-full h-full object-cover" />
                      ) : (
                        <span className="opacity-40 text-xs">📷</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#83A6CE] font-mono tracking-wide">{item.codigo_fabrica}</p>
                      <p className="text-[13px] font-semibold text-[#0D1E4C] truncate leading-tight"><strong>{item.descricao}</strong></p>
                    </div>
                  </div>
                );

                return (
                  <div key={item.codigo_fabrica} data-testid="produto-compacto" className="bg-white rounded-xl border border-[#E8EDF5] shadow-[0_1px_4px_rgba(13,30,76,0.07)] p-3 hover:shadow-[0_4px_20px_rgba(13,30,76,0.13)] hover:-translate-y-0.5 transition-all duration-200">
                    {temVariacoes ? (
                      <div>
                        {conteudoLinha}
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-[15px] font-bold text-[#C48CB3]">R$ {formatarPreco(item.preco_venda)}</span>
                          <button
                            onClick={() => toggleVariacoes(item.codigo_fabrica)}
                            className="text-sm text-[#C48CB3] font-medium underline"
                          >
                            Ver variações
                          </button>
                        </div>
                        
                        {variacoesExpandidas[item.codigo_fabrica] && (
                          <div className="mt-3 pt-3 border-t border-[var(--borda-sutil)] space-y-2">
                            {item.variacoes.map((v) => {
                              const label = [v.atributo1, v.atributo2, v.atributo3].filter(Boolean).join(' / ');
                              const esgotada = v.estoque_disponivel === 0;
                              return (
                                <div key={v.id} data-testid="linha-variacao" className="flex items-center gap-2">
                                  <DraggableVariacao item={item} variacao={v} disabled={esgotada}>
                                    <div className="flex flex-col">
                                      <span className="text-sm text-[var(--texto-forte)]">{label}</span>
                                      {(() => {
                                        const precosV = calcularPrecos(v.preco_venda);
                                        return precosV.temDesconto ? (
                                          <div className="flex flex-col">
                                            <span className="text-[11px] text-[#83A6CE] line-through">R$ {formatarPreco(precosV.cheio)}</span>
                                            <span className="text-[15px] font-bold text-[#C48CB3]">R$ {formatarPreco(precosV.pix)} Pix</span>
                                          </div>
                                        ) : (
                                          <span className="text-[15px] font-bold text-[#C48CB3]">R$ {formatarPreco(v.preco_venda)}</span>
                                        );
                                      })()}
                                    </div>
                                  </DraggableVariacao>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${esgotada ? 'bg-[rgba(192,82,106,0.1)] text-[#C0526A]' : 'bg-[rgba(74,155,127,0.1)] text-[#4A9B7F]'}`}>
                                      {esgotada ? 'ESGOTADO' : v.estoque_disponivel}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <DraggableProduto item={item} disabled={item.estoque_disponivel === 0}>
                          {conteudoLinha}
                        </DraggableProduto>
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex flex-col">
                            {(() => {
                              const precos = calcularPrecos(item.preco_venda);
                              return precos.temDesconto ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[11px] text-[#83A6CE] line-through">
                                    R$ {formatarPreco(precos.cheio)}
                                  </span>
                                  <span className="text-[15px] font-bold text-[#C48CB3]">
                                    R$ {formatarPreco(precos.pix)} no Pix
                                  </span>
                                  <span className="text-[11px] text-[#83A6CE]">
                                    R$ {formatarPreco(precos.cartao)} no cartão
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[15px] font-bold text-[#C48CB3]">
                                  R$ {formatarPreco(item.preco_venda)}
                                </span>
                              );
                            })()}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block text-center w-fit ${item.estoque_disponivel === 0 ? 'bg-[rgba(192,82,106,0.1)] text-[#C0526A]' : 'bg-[rgba(74,155,127,0.1)] text-[#4A9B7F]'}`}>
                              {item.estoque_disponivel === 0 ? 'ESG\u200BOTADO' : `Estoque: ${item.estoque_disponivel}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUNA 2: CARRINHOS (40%) */}
          <div className="h-full overflow-y-auto p-4 border-r border-[var(--borda-sutil)] flex flex-col bg-gray-50">
            <h3 className="text-lg font-bold text-[var(--texto-forte)] mb-4 shrink-0">Carrinhos</h3>
            
            <div className="mb-4 shrink-0 flex gap-2">
              <button
                onClick={() => setMostrarNovoCarrinho(true)}
                className="w-full bg-[var(--verde-disponivel)] text-white font-semibold py-2 rounded-lg text-sm shadow-sm hover:opacity-90"
              >
                + Novo Carrinho
              </button>
            </div>

            {mostrarNovoCarrinho && (
              <div className="bg-white rounded-lg shadow-md p-4 mb-4 shrink-0 space-y-3 border border-gray-100 relative z-10">
                <input
                  id="input-novo-carrinho"
                  placeholder="Buscar ou cadastrar cliente"
                  value={termoCliente}
                  onChange={handleBuscarCliente}
                  className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--verde-disponivel)]"
                />
                {resultadosClientes.length > 0 && (
                  <ul className="border border-[var(--borda-sutil)] rounded-lg bg-white mt-1 w-full max-h-40 overflow-y-auto">
                    {resultadosClientes.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => selecionarClienteParaCarrinho(c)}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 text-[var(--texto-forte)] border-b last:border-b-0"
                      >
                        {c.nome}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-gray-100 pt-3 mt-1 space-y-2">
                  <p className="text-xs text-gray-400 font-medium">
                    Cadastrar nova cliente:
                  </p>
                  <input
                    placeholder="Nome"
                    value={novoClienteNome}
                    onChange={e => setNovoClienteNome(e.target.value)}
                    className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--verde-disponivel)]"
                  />
                  <input
                    placeholder="Telefone (com DDD)"
                    value={novoClienteWhatsapp}
                    onChange={e => setNovoClienteWhatsapp(e.target.value)}
                    className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--verde-disponivel)]"
                  />
                  <button
                    onClick={handleCadastrarAbrirCarrinho}
                    disabled={!novoClienteNome.trim() || !novoClienteWhatsapp.trim()}
                    className="w-full bg-[var(--roxo)] text-white text-sm py-2 rounded-lg hover:opacity-90 font-medium disabled:opacity-40"
                  >
                    OK — Abrir Carrinho
                  </button>
                </div>
              </div>
            )}

            <div className="mb-4 shrink-0">
              <input
                placeholder="Buscar carrinho"
                value={termoBuscaCarrinho}
                onChange={e => setTermoBuscaCarrinho(e.target.value)}
                className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10">
              {mostrarNovoCarrinho ? null : estadoCarrinhos.carrinhos.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">
                  <span className="text-4xl block mb-2">🛒</span>
                  <p className="text-sm">Nenhum carrinho aberto.</p>
                </div>
              ) : (
                carrinhosVisiveis.map((c) => (
                  <DropzoneCarrinhoCard key={c.clienteId} carrinho={c}>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                      <h3 className="font-semibold text-[var(--texto-forte)] truncate">
                        {c.cliente.nome}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        c.status === 'aberto' ? 'bg-[rgba(131,166,206,0.15)] text-[#26415E]' :
                        c.status === 'fechado' ? 'bg-[rgba(196,140,179,0.15)] text-[#C48CB3]' : 'bg-[rgba(74,155,127,0.15)] text-[#4A9B7F]'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <ul data-testid="itens-carrinho" className="space-y-2 py-1 min-h-[40px]">
                      {c.itens.map((item, idx) => (
                        <li key={item.reservaId || `item-${idx}-${item.codigo_fabrica}`} className="flex justify-between items-start text-sm">
                          <div className="flex-1 leading-tight text-[var(--texto-forte)]">
                            {item.descricao} <br />
                            <span className="text-[#C48CB3] font-semibold">R$ {formatarPreco(item.preco_venda)}</span>
                          </div>
                          {c.status === 'aberto' && (
                            <button
                              onClick={() => handleRemover(c.clienteId, item.reservaId, idx)}
                              className="text-red-500 text-xs ml-2 hover:underline shrink-0"
                            >
                              Remover
                            </button>
                          )}
                        </li>
                      ))}
                      {c.itens.length === 0 && c.status === 'aberto' && (
                        <p className="text-xs text-gray-400 text-center italic mt-2">Arraste produtos aqui</p>
                      )}
                    </ul>

                    <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                      <p className="font-bold text-[#0D1E4C] text-sm">
                        Total: R$ {formatarPreco(totalDoCarrinho(c))}
                      </p>

                      {c.status === 'aberto' && (
                        <button
                          onClick={() => handleFecharCarrinho(c.clienteId)}
                          style={{ background: '#26415E' }}
                          className="w-full text-white font-medium py-2 rounded-lg text-sm hover:opacity-90"
                        >
                          Fechar
                        </button>
                      )}

                      {c.status === 'fechado' && (
                        <button
                          onClick={() => handleEnviarVenda(c)}
                          disabled={statusFechamento[c.clienteId] === 'enviando' || c.itens.length === 0}
                          style={{ background: '#4A9B7F' }}
                          className="w-full text-white font-medium py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-40"
                        >
                          Enviar
                        </button>
                      )}

                      {c.status === 'enviado' && (
                        <div className="text-center py-1 space-y-1">
                          <p className="text-[var(--verde-disponivel)] font-bold text-xs">
                            ✓ Venda registrada no Kanban!
                          </p>
                          {statusFechamento[c.clienteId]?.falhas > 0 && (
                            <p className="text-xs text-gray-500">
                              (Use a aba Kanban para enviar via WhatsApp Web)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </DropzoneCarrinhoCard>
                ))
              )}
            </div>
          </div>

          {/* COLUNA 3: ESCUTADOR (30%) */}
          <div className="painel-escuta">
            <PainelEscutador />
          </div>

        </div>
        
        <ImportarLoteModal
          aberto={showImportarModal}
          onFechar={() => setShowImportarModal(false)}
          onImportar={handleImportarLote}
        />
        <DragOverlay dropAnimation={null}>
          {itemArrastando ? (
            <div style={{
              background: 'white',
              borderRadius: 12,
              boxShadow: '3px 5px 30px rgba(13,30,76,0.22)',
              padding: 12,
              width: 160,
              transform: 'rotate(2deg)',
              cursor: 'grabbing',
            }}>
              {itemArrastando.storage_url && (
                <img
                  src={itemArrastando.storage_url}
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
              )}
              <p style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#0D1E4C',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
              }}>
                {itemArrastando.descricao}
              </p>
              <p style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#C48CB3',
                margin: '2px 0 0',
              }}>
                R$ {formatarPreco(itemArrastando.preco_venda)}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
