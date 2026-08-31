import { useEffect, useState } from 'react';
import ErpStatusBanner from './components/ErpStatusBanner.jsx';
import WhatsappStatusBadge from './components/WhatsappStatusBadge.jsx';
import CatalogoPage from './pages/CatalogoPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import LivePage from './pages/LivePage.jsx';
import KanbanPage from './pages/KanbanPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

const LIVE_KEY = 'precificaai:liveAtiva';

const PAGINAS = [
  { key: 'dashboard', label: 'Dashboard', icone: '🏠', Componente: DashboardPage },
  { key: 'catalogo', label: 'Catálogo', icone: '🗂️', Componente: CatalogoPage },
  { key: 'clientes', label: 'Clientes', icone: '👥', Componente: ClientesPage },
  { key: 'live', label: 'Live', icone: '🎥', Componente: LivePage },
  { key: 'kanban', label: 'Kanban', icone: '📋', Componente: KanbanPage },
];

function formatarCronometro(ms) {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function App() {
  const [paginaAtiva, setPaginaAtiva] = useState('live');
  const [liveAtiva, setLiveAtiva] = useState(() => {
    const raw = localStorage.getItem(LIVE_KEY);
    if (raw) return JSON.parse(raw);
    // Auto-inicializar Live se estiver sem chave salva para entrar direto no painel
    const padrao = { id: Date.now(), nome: 'Live Central — TextoJoia', iniciada_em: new Date().toISOString() };
    localStorage.setItem(LIVE_KEY, JSON.stringify(padrao));
    return padrao;
  });
  const [carrinhoCount, setCarrinhoCount] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  // LivePage avisa aqui via CustomEvent — sem subir estado, sem tocar em services.
  useEffect(() => {
    const onLiveAtiva = (e) => setLiveAtiva(e.detail);
    const onCarrinho = (e) => setCarrinhoCount(e.detail);
    window.addEventListener('precificaai:live-ativa', onLiveAtiva);
    window.addEventListener('precificaai:carrinho-count', onCarrinho);
    return () => {
      window.removeEventListener('precificaai:live-ativa', onLiveAtiva);
      window.removeEventListener('precificaai:carrinho-count', onCarrinho);
    };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const PaginaAtual = PAGINAS.find((p) => p.key === paginaAtiva).Componente;
  const cronometro = liveAtiva?.iniciada_em
    ? formatarCronometro(agora - new Date(liveAtiva.iniciada_em).getTime())
    : null;

  return (
    <div className="min-h-screen bg-[var(--fundo)] flex flex-col font-sans">
      <header style={{
        background: '#0B1B32',
        height: 56,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        zIndex: 10,
        position: 'relative',
        borderBottom: '1px solid #26415E',
      }}>
        <div style={{ background: 'rgba(196,140,179,0.2)', color: '#C48CB3' }} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
          {/* Logo placeholder circular */}
          <span className="font-bold">L</span>
        </div>
        <h1 style={{ color: 'white', fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }} className="mr-4">Central de Live</h1>
        <ErpStatusBanner online={true} />
        {cronometro && (
          <span style={{ background: 'rgba(255,255,255,0.07)', color: '#83A6CE', border: '1px solid rgba(131,166,206,0.2)' }} className="text-sm font-medium px-3 py-1.5 rounded-full">
            ⏱ {cronometro}
          </span>
        )}
        {carrinhoCount > 0 && (
          <span style={{ background: 'rgba(196,140,179,0.15)', color: '#C48CB3' }} className="text-sm font-semibold px-3 py-1.5 rounded-full">
            📦 {carrinhoCount} itens
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <WhatsappStatusBadge />
        </div>
      </header>

      <div className={paginaAtiva === 'live' && liveAtiva ? 'live-layout' : 'flex flex-1 overflow-hidden p-4 gap-4'}>
        <aside className="sidebar-nav shrink-0 w-[280px]">
          <nav className="flex flex-col gap-1">
          {PAGINAS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPaginaAtiva(p.key)}
              className={`sidebar-nav-item ${paginaAtiva === p.key ? 'active' : ''}`}
            >
              <span>{p.icone}</span>
              {p.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className={
        paginaAtiva === 'live' && liveAtiva
          ? 'flex-1 overflow-hidden min-h-0'
          : 'flex-1 overflow-auto'
      }>
        <PaginaAtual onNavigate={setPaginaAtiva} />
      </main>
      </div>
    </div>
  );
}
export default App;
