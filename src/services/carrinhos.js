export function estadoInicial() {
  return { carrinhos: [] };
}

export function abrirCarrinho(estado, cliente) {
  const index = estado.carrinhos.findIndex(c => c.clienteId === cliente.id);
  
  if (index !== -1) {
    // Already exists, move to top
    const carrinho = estado.carrinhos[index];
    const outros = estado.carrinhos.filter((_, i) => i !== index);
    return {
      ...estado,
      carrinhos: [carrinho, ...outros]
    };
  }

  // Create new
  const novoCarrinho = {
    clienteId: cliente.id,
    cliente,
    itens: [],
    status: 'aberto'
  };

  return {
    ...estado,
    carrinhos: [novoCarrinho, ...estado.carrinhos]
  };
}

export function adicionarItem(estado, clienteId, item) {
  const index = estado.carrinhos.findIndex(c => c.clienteId === clienteId);
  if (index === -1) {
    throw new Error('Carrinho não encontrado para este cliente');
  }

  const carrinho = estado.carrinhos[index];
  const novoCarrinho = {
    ...carrinho,
    itens: [...carrinho.itens, item]
  };

  const outros = estado.carrinhos.filter((_, i) => i !== index);
  return {
    ...estado,
    carrinhos: [novoCarrinho, ...outros]
  };
}

export function removerItem(estado, clienteId, reservaId, itemIndex) {
  return {
    ...estado,
    carrinhos: estado.carrinhos.map(c => {
      if (c.clienteId === clienteId) {
        let removido = false;
        return {
          ...c,
          itens: c.itens.filter((i, idx) => {
            if (removido) return true;
            if (reservaId && i.reservaId && i.reservaId === reservaId) {
              removido = true;
              return false;
            }
            if (itemIndex !== undefined && itemIndex !== null && idx === itemIndex) {
              removido = true;
              return false;
            }
            if (reservaId && i.reservaId === reservaId) {
              removido = true;
              return false;
            }
            return true;
          })
        };
      }
      return c;
    })
  };
}

export function fecharCarrinho(estado, clienteId) {
  return {
    ...estado,
    carrinhos: estado.carrinhos.map(c => {
      if (c.clienteId === clienteId) {
        return { ...c, status: 'fechado' };
      }
      return c;
    })
  };
}

export function marcarEnviado(estado, clienteId) {
  return {
    ...estado,
    carrinhos: estado.carrinhos.map(c => {
      if (c.clienteId === clienteId) {
        return { ...c, status: 'enviado' };
      }
      return c;
    })
  };
}

export function totalDoCarrinho(carrinho) {
  return carrinho.itens.reduce((acc, item) => acc + (item.preco_venda || 0), 0);
}
