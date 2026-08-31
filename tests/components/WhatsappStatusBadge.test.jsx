// tests/components/WhatsappStatusBadge.test.jsx
// CONTRATO do src/components/WhatsappStatusBadge.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Badge permanente de conexão do WhatsApp (vai no header do App).
// - No mount chama evolution.verificarConexao()
//   state 'open'  → texto contendo "WhatsApp conectado"
//   outro estado  → texto contendo "desconectado" + role="alert"
// - Desconectado: clicar no badge → chama evolution.obterQrCode()
//   e mostra modal com <img alt contendo "QR"> cujo src é o base64
// - EvolutionOfflineError no verificar → trata como desconectado
//   (sem quebrar a tela)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const verificarConexao = vi.fn();
const obterQrCode = vi.fn();
class EvolutionOfflineError extends Error {}
vi.mock('../../src/services/evolution.js', () => ({
  evolution: {
    verificarConexao, obterQrCode,
    enviarTexto: vi.fn(), enviarImagem: vi.fn(),
  },
  EvolutionOfflineError,
}));

const { default: WhatsappStatusBadge } = await import(
  '../../src/components/WhatsappStatusBadge.jsx'
);

beforeEach(() => {
  verificarConexao.mockReset();
  obterQrCode.mockReset();
});

describe('WhatsappStatusBadge', () => {
  it('conectado quando state open', async () => {
    verificarConexao.mockResolvedValue({ ok: true, status: 200, data: { instance: { state: 'open' } } });
    render(<WhatsappStatusBadge />);
    expect(await screen.findByText(/whatsapp conectado/i)).toBeInTheDocument();
  });

  it('desconectado (state close) vira alerta', async () => {
    verificarConexao.mockResolvedValue({ ok: true, status: 200, data: { instance: { state: 'close' } } });
    render(<WhatsappStatusBadge />);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/desconectado/i);
  });

  it('EvolutionOfflineError também mostra desconectado sem quebrar', async () => {
    verificarConexao.mockRejectedValue(new EvolutionOfflineError('down'));
    render(<WhatsappStatusBadge />);
    expect(await screen.findByText(/desconectado/i)).toBeInTheDocument();
  });

  it('clicar desconectado abre modal com o QR', async () => {
    verificarConexao.mockResolvedValue({ ok: true, status: 200, data: { instance: { state: 'close' } } });
    obterQrCode.mockResolvedValue({ ok: true, status: 200, data: { base64: 'data:image/png;base64,QRFAKE==' } });
    render(<WhatsappStatusBadge />);
    await userEvent.click(await screen.findByText(/desconectado/i));
    const img = await screen.findByRole('img', { name: /qr/i });
    expect(img).toHaveAttribute('src', 'data:image/png;base64,QRFAKE==');
  });
});
