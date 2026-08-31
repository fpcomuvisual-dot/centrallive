// tests/services/fechamento.test.js
// CONTRATO do src/services/fechamento.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Orquestra o FECHAR VENDA no WhatsApp da cliente.
// Assinatura (export nomeado `fecharVenda`):
//   fecharVenda({ cliente, itens, total }, opts = {})
//     cliente: { nome, whatsapp }
//     itens:   [{ codigo_fabrica, descricao, preco_venda }]
//     total:   number
//     opts.delay: async fn chamada ENTRE mensagens consecutivas
//                 (default da implementação: aleatório 15-45s —
//                  anti-ban; nos testes injetamos delay imediato)
//   → Promise<{ enviadas: number, falhas: number }>
//
// SEQUÊNCIA OBRIGATÓRIA:
//   1. evolution.enviarTexto(whatsapp,
//        "Oi amigaaa, vou te ajudar a fechar sua compra tá? 💛")
//   2. Para cada item, EM ORDEM:
//        imagem = await artesService.buscarImagemPorSku(codigo_fabrica)
//        com imagem  → evolution.enviarImagem(whatsapp, imagem,
//                       `${descricao} — R$ ${preco em BR}`)
//        sem imagem  → evolution.enviarTexto(whatsapp,
//                       `${descricao} — R$ ${preco em BR}`)
//   3. evolution.enviarTexto(whatsapp,
//        `Total: R$ ${total em BR} — vai ser Pix ou cartão? 😊`)
//   - opts.delay é aguardada entre cada par de mensagens consecutivas
//     (total de chamadas = mensagens - 1); NUNCA antes da primeira.
//   - Envio que falhar (throw ou ok:false) conta em `falhas` e o
//     fluxo CONTINUA até o fim (mensagem do total sempre tentada).
//
// artesService ganha método NOVO nesta fase:
//   artesService.buscarImagemPorSku(sku) → Promise<string|null>
//   (procura nas sessões uma arte com aquele sku e devolve storage_url)

import { describe, it, expect, vi, beforeEach } from 'vitest';

const enviarTexto = vi.fn();
const enviarImagem = vi.fn();
class EvolutionOfflineError extends Error {}
vi.mock('../../src/services/evolution.js', () => ({
  evolution: { enviarTexto, enviarImagem },
  EvolutionOfflineError,
}));

const buscarImagemPorSku = vi.fn();
vi.mock('../../src/services/artes.js', () => ({
  artesService: {
    buscarImagemPorSku,
    listarSessoes: vi.fn(),
    vincularSku: vi.fn(),
  },
}));

const { fecharVenda } = await import('../../src/services/fechamento.js');

const maria = { nome: 'Maria Silva', whatsapp: '5518999990001' };
const anel = { codigo_fabrica: 'AN-1664', descricao: 'ANEL FLOR ROSA RODIO', preco_venda: 89.9 };
const presilha = { codigo_fabrica: 'PR-0101', descricao: 'PRESILHA BORBOLETA', preco_venda: 22.0 };

beforeEach(() => {
  enviarTexto.mockReset().mockResolvedValue({ ok: true, status: 201, data: {} });
  enviarImagem.mockReset().mockResolvedValue({ ok: true, status: 201, data: {} });
  buscarImagemPorSku.mockReset().mockResolvedValue('https://fake/arte.jpg');
});

describe('fecharVenda — sequência feliz', () => {
  it('saudação → imagem por item com caption → total, tudo pro whats da cliente', async () => {
    const delay = vi.fn().mockResolvedValue();
    const r = await fecharVenda(
      { cliente: maria, itens: [anel, presilha], total: 111.9 },
      { delay }
    );

    // saudação primeiro
    expect(enviarTexto.mock.calls[0][0]).toBe('5518999990001');
    expect(enviarTexto.mock.calls[0][1]).toMatch(/oi amigaaa/i);

    // uma imagem por item, na ordem, com caption nome — preço BR
    expect(enviarImagem).toHaveBeenNthCalledWith(
      1, '5518999990001', 'https://fake/arte.jpg', 'ANEL FLOR ROSA RODIO — R$ 89,90'
    );
    expect(enviarImagem).toHaveBeenNthCalledWith(
      2, '5518999990001', 'https://fake/arte.jpg', 'PRESILHA BORBOLETA — R$ 22,00'
    );

    // total por último, formato BR + pergunta de pagamento
    const ultimaMsg = enviarTexto.mock.calls.at(-1)[1];
    expect(ultimaMsg).toMatch(/total: r\$ 111,90/i);
    expect(ultimaMsg).toMatch(/pix ou cartão/i);

    // 4 mensagens → 3 delays, nunca antes da primeira
    expect(delay).toHaveBeenCalledTimes(3);
    expect(r).toEqual({ enviadas: 4, falhas: 0 });
  });

  it('item sem imagem vira texto (fallback), sem quebrar a sequência', async () => {
    buscarImagemPorSku.mockResolvedValueOnce(null);
    await fecharVenda({ cliente: maria, itens: [anel], total: 89.9 }, { delay: async () => {} });
    expect(enviarImagem).not.toHaveBeenCalled();
    const textos = enviarTexto.mock.calls.map((c) => c[1]);
    expect(textos.some((t) => t === 'ANEL FLOR ROSA RODIO — R$ 89,90')).toBe(true);
  });
});

describe('fecharVenda — resiliência', () => {
  it('falha numa imagem conta em falhas e o total ainda é enviado', async () => {
    enviarImagem.mockRejectedValueOnce(new EvolutionOfflineError('caiu'));
    const r = await fecharVenda(
      { cliente: maria, itens: [anel, presilha], total: 111.9 },
      { delay: async () => {} }
    );
    expect(r.falhas).toBe(1);
    expect(r.enviadas).toBe(3);
    const ultimaMsg = enviarTexto.mock.calls.at(-1)[1];
    expect(ultimaMsg).toMatch(/total/i);
  });

  it('resposta ok:false também conta como falha sem abortar', async () => {
    enviarTexto.mockResolvedValueOnce({ ok: false, status: 400, data: {} }); // saudação falha
    const r = await fecharVenda(
      { cliente: maria, itens: [anel], total: 89.9 },
      { delay: async () => {} }
    );
    expect(r.falhas).toBe(1);
    expect(enviarImagem).toHaveBeenCalledTimes(1); // fluxo continuou
  });
});
