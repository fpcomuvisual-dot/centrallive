// tests/components/ArteCard.test.jsx
// CONTRATO do src/components/ArteCard.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Props: { arte: { nome, preco, parcelas, storage_url, sku? },
//          onVincular: (arte) => void }
// - Sempre: <img> com src=storage_url e alt=nome; nome e preço visíveis
// - COM sku:  badge com o código do sku (ex: "AN-1664");
//             botão "Vincular ao estoque" NÃO existe
// - SEM sku:  badge com texto "Sem vínculo";
//             botão "Vincular ao estoque" existe e chama onVincular(arte)

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArteCard from '../../src/components/ArteCard.jsx';

const arteComSku = {
  nome: 'Anel Fileira',
  preco: 'R$ 10,00',
  parcelas: '10x R$ 1,00',
  storage_url: 'https://fake/anel.jpg',
  sku: 'AN-1664',
};

const arteSemSku = {
  nome: 'Brinco Argola',
  preco: 'R$ 69,90',
  parcelas: '3x R$ 23,30',
  storage_url: 'https://fake/brinco.jpg',
};

describe('ArteCard — conteúdo base', () => {
  it('mostra imagem, nome e preço', () => {
    render(<ArteCard arte={arteComSku} onVincular={() => {}} />);
    const img = screen.getByRole('img', { name: 'Anel Fileira' });
    expect(img).toHaveAttribute('src', 'https://fake/anel.jpg');
    expect(screen.getByText('Anel Fileira')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
  });
});

describe('ArteCard — com SKU vinculado', () => {
  it('mostra badge com o código e NÃO mostra botão de vincular', () => {
    render(<ArteCard arte={arteComSku} onVincular={() => {}} />);
    expect(screen.getByText('AN-1664')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vincular ao estoque/i })).not.toBeInTheDocument();
  });
});

describe('ArteCard — sem SKU', () => {
  it('mostra badge "Sem vínculo" e botão de vincular', () => {
    render(<ArteCard arte={arteSemSku} onVincular={() => {}} />);
    expect(screen.getByText(/sem vínculo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vincular ao estoque/i })).toBeInTheDocument();
  });

  it('clique no botão chama onVincular com a própria arte', async () => {
    const onVincular = vi.fn();
    render(<ArteCard arte={arteSemSku} onVincular={onVincular} />);
    await userEvent.click(screen.getByRole('button', { name: /vincular ao estoque/i }));
    expect(onVincular).toHaveBeenCalledTimes(1);
    expect(onVincular).toHaveBeenCalledWith(arteSemSku);
  });
});
