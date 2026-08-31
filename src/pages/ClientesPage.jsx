import { useEffect, useState } from 'react';
import { clientesService } from '../services/clientes.js';

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatarPreco(valor) {
  return Number(valor ?? 0).toFixed(2).replace('.', ',');
}

function FichaCliente({ cliente, onVoltar, onAtualizado }) {
  const [dados, setDados] = useState(cliente);
  const [vendas, setVendas] = useState([]);
  const [carregandoVendas, setCarregandoVendas] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregarVendas = async () => {
      setCarregandoVendas(true);
      try {
        const result = await clientesService.listarVendas(cliente.id);
        setVendas(result);
      } catch (err) {
        console.error('Erro ao carregar vendas:', err);
      } finally {
        setCarregandoVendas(false);
      }
    };
    carregarVendas();
  }, [cliente.id]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const atualizado = await clientesService.atualizar(dados.id, dados);
      setDados(atualizado);
      setEditando(false);
      if (onAtualizado) onAtualizado(atualizado);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente.');
    } finally {
      setSalvando(false);
    }
  };

  const avatar = dados.foto_url ? (
    <img src={dados.foto_url} alt={dados.nome} className="w-full h-full object-cover" />
  ) : (
    <span className="font-bold text-[var(--roxo)] text-2xl">
      {dados.nome?.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="bg-[var(--card-bg)] rounded-[var(--card-radius)] shadow-[var(--card-shadow)] p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-[var(--borda-sutil)] pb-4">
        <button
          onClick={onVoltar}
          className="text-[var(--texto-fraco)] hover:text-[var(--texto-forte)] flex items-center gap-2 text-sm font-medium"
        >
          ← Voltar
        </button>
        <div>
          {editando ? (
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-[var(--gradiente-primario)] text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          ) : (
            <button
              onClick={() => setEditando(true)}
              className="border border-[var(--borda-sutil)] text-[var(--texto-forte)] px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[var(--borda-sutil)] flex items-center justify-center shrink-0 overflow-hidden">
          {avatar}
        </div>
        <div className="flex-1 space-y-2">
          {editando ? (
            <>
              <input
                value={dados.nome}
                onChange={e => setDados({ ...dados, nome: e.target.value })}
                placeholder="Nome da cliente"
                className="w-full border border-[var(--borda-sutil)] rounded px-2 py-1 text-lg font-bold focus:ring-2 focus:ring-[var(--roxo)]"
              />
              <div className="flex gap-2">
                <input
                  value={dados.whatsapp || ''}
                  onChange={e => setDados({ ...dados, whatsapp: e.target.value })}
                  placeholder="WhatsApp"
                  className="flex-1 border border-[var(--borda-sutil)] rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--roxo)]"
                />
                <input
                  value={dados.instagram || ''}
                  onChange={e => setDados({ ...dados, instagram: e.target.value })}
                  placeholder="@instagram"
                  className="flex-1 border border-[var(--borda-sutil)] rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--roxo)]"
                />
              </div>
              <input
                value={dados.endereco || ''}
                onChange={e => setDados({ ...dados, endereco: e.target.value })}
                placeholder="Endereço"
                className="w-full border border-[var(--borda-sutil)] rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--roxo)]"
              />
              <input
                value={dados.foto_url || ''}
                onChange={e => setDados({ ...dados, foto_url: e.target.value })}
                placeholder="URL da foto"
                className="w-full border border-[var(--borda-sutil)] rounded px-2 py-1 text-sm focus:ring-2 focus:ring-[var(--roxo)]"
              />
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[var(--texto-forte)]">{dados.nome}</h2>
              <p className="text-[var(--texto-fraco)] text-sm">
                {dados.instagram && <span className="mr-3">{dados.instagram}</span>}
                <span>{dados.whatsapp}</span>
              </p>
              {dados.endereco && <p className="text-[var(--texto-fraco)] text-sm">{dados.endereco}</p>}
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-[var(--texto-forte)] text-sm uppercase tracking-wide">Anotações</h3>
        {editando ? (
          <textarea
            value={dados.anotacoes || ''}
            onChange={e => setDados({ ...dados, anotacoes: e.target.value })}
            placeholder="Adicione anotações sobre a cliente..."
            className="w-full border border-[var(--borda-sutil)] rounded-lg p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-[var(--roxo)]"
          />
        ) : (
          <div className="bg-gray-50 border border-[var(--borda-sutil)] rounded-lg p-3 min-h-[60px] whitespace-pre-wrap text-sm text-[var(--texto-forte)]">
            {dados.anotacoes ? dados.anotacoes : <span className="text-gray-400 italic">Nenhuma anotação.</span>}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-[var(--texto-forte)] text-sm uppercase tracking-wide">Histórico de Compras</h3>
        {carregandoVendas ? (
          <p className="text-sm text-[var(--texto-fraco)]">Carregando...</p>
        ) : vendas.length === 0 ? (
          <p className="text-sm text-[var(--texto-fraco)] italic">Nenhuma compra ainda.</p>
        ) : (
          <div className="space-y-3">
            {vendas.map(v => (
              <div key={v.id} className="border border-[var(--borda-sutil)] rounded-lg p-4 space-y-2 bg-white">
                <div className="flex justify-between items-center text-sm border-b border-[var(--borda-sutil)] pb-2 mb-2">
                  <span className="font-medium text-[var(--texto-forte)]">{formatarData(v.criada_em)}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--roxo)]">R$ {formatarPreco(v.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${v.status === 'entregue' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {v.status}
                    </span>
                  </div>
                </div>
                {v.itens?.map((item, i) => (
                  <p key={i} className="text-xs text-[var(--texto-fraco)] flex justify-between">
                    <span>• {item.descricao}</span>
                    <span>R$ {formatarPreco(item.preco_venda)}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [termo, setTermo] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [endereco, setEndereco] = useState('');
  const [erro, setErro] = useState('');

  const [clienteSelecionado, setClienteSelecionado] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      setClientes(await clientesService.listar());
    };
    carregar();
  }, []);

  const handleBuscar = async (valor) => {
    setTermo(valor);
    setClientes(valor.trim() === '' ? await clientesService.listar() : await clientesService.buscar(valor));
  };

  const handleSalvar = async () => {
    if (!nome.trim() || !whatsapp.trim()) {
      setErro('Nome e WhatsApp são obrigatórios');
      return;
    }
    setErro('');
    try {
      const novo = await clientesService.criar({ nome, whatsapp, instagram, endereco });
      setClientes((prev) => [...prev, novo]);
      setNome('');
      setWhatsapp('');
      setInstagram('');
      setEndereco('');
      setMostrarForm(false);
    } catch (err) {
      if (err.status === 409) {
        setErro('WhatsApp duplicado');
      } else {
        setErro('Erro ao salvar cliente');
      }
    }
  };

  const handleClienteAtualizado = (clienteAtualizado) => {
    setClientes(clientes.map(c => c.id === clienteAtualizado.id ? clienteAtualizado : c));
  };

  if (clienteSelecionado) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <FichaCliente
          cliente={clienteSelecionado}
          onVoltar={() => setClienteSelecionado(null)}
          onAtualizado={handleClienteAtualizado}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center gap-4">
        <input
          placeholder="Buscar cliente"
          value={termo}
          onChange={(e) => handleBuscar(e.target.value)}
          className="flex-1 border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
        />
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-[var(--gradiente-primario)] text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-sm hover:opacity-90"
        >
          Novo cliente
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-[var(--card-bg)] rounded-[var(--card-radius)] shadow-[var(--card-shadow)] p-4 space-y-2 max-w-md">
          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
          />
          <input
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
          />
          <input
            placeholder="Instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
          />
          <input
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="border border-[var(--borda-sutil)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[var(--roxo)]"
          />
          {erro && <p className="text-[var(--vermelho-esgotado)] text-sm">{erro}</p>}
          <button
            onClick={handleSalvar}
            className="bg-[var(--gradiente-primario)] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      )}

      {clientes.length === 0 ? (
        <p className="text-[var(--texto-fraco)] text-sm">Nenhum cliente cadastrado.</p>
      ) : (
        <ul className="divide-y divide-[var(--borda-sutil)] rounded-[var(--card-radius)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">
          {clientes.map((c) => (
            <li
              key={c.id}
              onClick={() => setClienteSelecionado(c)}
              className="px-4 py-3 text-sm cursor-pointer hover:bg-[var(--fundo)] flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--borda-sutil)] flex items-center justify-center shrink-0 overflow-hidden">
                {c.foto_url
                  ? <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover" />
                  : <span className="font-bold text-[var(--roxo)] text-sm">
                      {c.nome?.charAt(0).toUpperCase()}
                    </span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--texto-forte)] truncate">{c.nome}</p>
                <p className="text-[var(--texto-fraco)] text-xs">{c.whatsapp}</p>
              </div>
              <span className="text-[var(--texto-fraco)] text-xs">→</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
