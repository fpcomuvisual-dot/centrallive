export default function ArteCard({ arte, onVincular, onGerenciarVariacoes }) {
  return (
    <div className="rounded-card overflow-hidden bg-white shadow-sm">
      <img src={arte.storage_url} alt={arte.nome} className="w-full aspect-square object-cover" />
      <div className="p-3 space-y-1">
        <p className="font-medium text-sm text-forte">{arte.nome}</p>
        <p className="text-sm text-brand-roxo font-semibold">{arte.preco}</p>
        {arte.parcelas && <p className="text-xs text-fraco">{arte.parcelas}</p>}
        {arte.sku ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block bg-green-50 text-disponivel text-xs px-2 py-0.5 rounded-full font-medium">
              {arte.sku}
            </span>
            {onGerenciarVariacoes && (
              <button
                onClick={() => onGerenciarVariacoes(arte)}
                className="text-xs text-brand-roxo underline"
              >
                Variações
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-block bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
              Sem vínculo
            </span>
            <button
              onClick={() => onVincular(arte)}
              className="text-xs text-brand-roxo underline"
            >
              Vincular ao estoque
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
