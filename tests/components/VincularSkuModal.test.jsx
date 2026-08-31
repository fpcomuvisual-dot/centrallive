// tests/components/VincularSkuModal.test.jsx
// CONTRATO do src/components/VincularSkuModal.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Props: { aberto: boolean, arte: {...} | null,
//          onFechar: () => void,
//          onVincular: (codigo_fabrica) => void }
// Comportamento:
// - aberto=false → não renderiza nada
// - aberto=true → dialog (role="dialog") com o nome da arte,
//   input de busca (placeholder contendo "Buscar") e botão "Buscar"
// - Buscar → chama erp.buscarProdutos(termo) e lista os resultados
//   (codigo_fabrica + descricao visíveis em cada item)
// - Clicar num resultado → chama onVincular(codigo_fabrica)
// - erp.buscarProdutos lançou ErpOfflineError → mostra texto
//   contendo "ERP offline" (e NÃO quebra a tela)
// - Botão/ação de fechar → chama onFechar
//
// O módulo erp.js é DEPENDÊNCIA deste componente (não é o módulo
// sob teste) — mockado aqui. O componente deve importar de
// '../services/erp.js' (ou seja: src/services/erp.js).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const buscarProdutos = vi.fn();
class ErpOfflineError extends Error {}

vi.mock('../../src/services/erp.js', () => ({
  erp: { buscarProdutos },
  ErpOfflineError,
}));

const { default: VincularSkuModal } = await import('../../src/components/VincularSkuModal.jsx');

const arte = { nome: 'Brinco Argola', preco: 'R$ 69,90', storage_url: 'https://fake/b.jpg' };

beforeEach(() => {
  buscarProdutos.mockReset();
});

describe('VincularSkuModal — visibilidade', () => {
  it('não renderiza nada quando aberto=false', () => {
    const { container } = render(
      <VincularSkuModal aberto={false} arte={arte} onFechar={() => {}} onVincular={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza dialog com o nome da arte quando aberto', () => {
    render(<VincularSkuModal aberto={true} arte={arte} onFechar={() => {}} onVincular={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/brinco argola/i)).toBeInTheDocument();
  });
});

describe('VincularSkuModal — busca e seleção', () => {
  it('busca no ERP e lista resultados', async () => {
    buscarProdutos.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        resultados: [
          { codigo_fabrica: 'BR-2097', descricao: 'BRINCO OVAL CHAMPAGNHE', preco_venda: 68.7 },
          { codigo_fabrica: 'BR-1887', descricao: 'BRINCO PEDRA RETANGULAR', preco_venda: 59.7 },
        ],
      },
    });
    render(<VincularSkuModal aberto={true} arte={arte} onFechar={() => {}} onVincular={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'brinco');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));

    expect(buscarProdutos).toHaveBeenCalledWith('brinco');
    expect(await screen.findByText('BR-2097')).toBeInTheDocument();
    expect(screen.getByText(/BRINCO OVAL CHAMPAGNHE/i)).toBeInTheDocument();
    expect(screen.getByText('BR-1887')).toBeInTheDocument();
  });

  it('clicar num resultado chama onVincular com o codigo_fabrica', async () => {
    const onVincular = vi.fn();
    buscarProdutos.mockResolvedValue({
      ok: true,
      status: 200,
      data: { resultados: [{ codigo_fabrica: 'BR-2097', descricao: 'BRINCO OVAL', preco_venda: 68.7 }] },
    });
    render(<VincularSkuModal aberto={true} arte={arte} onFechar={() => {}} onVincular={onVincular} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'brinco');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    await userEvent.click(await screen.findByText('BR-2097'));

    expect(onVincular).toHaveBeenCalledWith('BR-2097');
  });

  it('lista vazia mostra aviso de nenhum resultado', async () => {
    buscarProdutos.mockResolvedValue({ ok: true, status: 200, data: { resultados: [] } });
    render(<VincularSkuModal aberto={true} arte={arte} onFechar={() => {}} onVincular={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'zzz');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText(/nenhum (produto|resultado)/i)).toBeInTheDocument();
  });
});

describe('VincularSkuModal — resiliência', () => {
  it('ERP offline mostra mensagem e não quebra', async () => {
    buscarProdutos.mockRejectedValue(new ErpOfflineError('offline'));
    render(<VincularSkuModal aberto={true} arte={arte} onFechar={() => {}} onVincular={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'brinco');
    await userEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(await screen.findByText(/erp offline/i)).toBeInTheDocument();
  });

  it('tem ação de fechar que chama onFechar', async () => {
    const onFechar = vi.fn();
    render(<VincularSkuModal aberto={true} arte={arte} onFechar={onFechar} onVincular={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /fechar|cancelar/i }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
