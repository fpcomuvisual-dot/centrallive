import { evolution } from './evolution.js';
import { artesService } from './artes.js';

function formatarPrecoBR(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

function delayPadrao() {
  const ms = 1_500 + Math.random() * 1_000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fecharVenda({ cliente, itens, total }, opts = {}) {
  const delay = opts.delay || delayPadrao;
  let enviadas = 0;
  let falhas = 0;
  let primeira = true;

  const nomeCompleto = (typeof cliente === 'object' ? cliente?.nome : null) || 'amiga';
  const primeiroNome = nomeCompleto.trim().split(' ')[0];
  const whatsapp = (typeof cliente === 'object' ? cliente?.whatsapp : cliente) || '';

  const executar = async (envio) => {
    if (!primeira) {
      await delay();
    }
    primeira = false;
    try {
      const res = await envio();
      if (res && res.ok === false) {
        falhas++;
      } else {
        enviadas++;
      }
    } catch {
      falhas++;
    }
  };

  // Mensagem 1: Oi {nome}!
  await executar(() =>
    evolution.enviarTexto(
      whatsapp,
      `Oi ${primeiroNome}!`
    )
  );

  // Mensagem 2: amiga, vou fechar a sua compra da live de hoje tá?
  await executar(() =>
    evolution.enviarTexto(
      whatsapp,
      'amiga, vou fechar a sua compra da live de hoje tá?'
    )
  );

  // Mensagem 3: ficou assim:
  await executar(() =>
    evolution.enviarTexto(
      whatsapp,
      'ficou assim:'
    )
  );

  // Mensagens com Foto + Descrição para CADA peça comprada
  for (const item of (itens || [])) {
    const desc = item.descricao || 'Produto';
    const preco = formatarPrecoBR(item.preco_venda ?? item.preco_cheio ?? item.preco ?? 0);
    const caption = `${desc} por R$ ${preco}`;
      
    await executar(async () => {
      const imagem = item.storage_url || (item.codigo_fabrica ? await artesService.buscarImagemPorSku(item.codigo_fabrica) : null);
      return imagem
        ? evolution.enviarImagem(whatsapp, imagem, caption)
        : evolution.enviarTexto(whatsapp, caption);
    });
  }

  // Última mensagem: Total somado + Pix ou cartão?
  await executar(() =>
    evolution.enviarTexto(
      whatsapp,
      `Total: R$ ${formatarPrecoBR(total)}\n\nPix ou cartão?`
    )
  );

  return { enviadas, falhas };
}
