// tests/components/ClientesPage.test.jsx
// CONTRATO do src/pages/ClientesPage.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Usa clientesService (mockado aqui). Comportamento:
// - Mount: lista clientesService.listar()
// - Vazio: texto contendo "Nenhum cliente"
// - Campo busca (placeholder contendo "Buscar"): digitar filtra via
//   clientesService.buscar(termo) e mostra só os retornados
// - Botão "Novo cliente" abre form com inputs de placeholders:
//   Nome, WhatsApp, Instagram, Endereço
// - Salvar com nome+whatsapp preenchidos → clientesService.criar
//   chamado com os 4 campos → novo cliente aparece na lista
// - Salvar SEM nome ou SEM whatsapp → criar NÃO é chamado e aparece
//   texto contendo "obrigatório"
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const listar = vi.fn();
const buscar = vi.fn();
const criar = vi.fn();

vi.mock('../../src/services/clientes.js', () => ({
  clientesService: { listar, buscar, criar },
}));

const { default: ClientesPage } = await import('../../src/pages/ClientesPage.jsx');

const maria = { id: 'c1', nome: 'Maria Silva', whatsapp: '5518999990001', instagram: '@maria', endereco: 'Rua A' };
const joana = { id: 'c2', nome: 'Joana Prado', whatsapp: '5518999990002', instagram: '@jo', endereco: 'Rua B' };

beforeEach(() => {
  listar.mockReset().mockReturnValue([maria, joana]);
  buscar.mockReset();
  criar.mockReset();
});

describe('ClientesPage — listagem e busca', () => {
  it('lista os clientes no mount', async () => {
    render(<ClientesPage />);
    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Joana Prado')).toBeInTheDocument();
  });

  it('estado vazio quando não há clientes', async () => {
    listar.mockReturnValue([]);
    render(<ClientesPage />);
    expect(await screen.findByText(/nenhum cliente/i)).toBeInTheDocument();
  });

  it('busca filtra pela clientesService.buscar', async () => {
    buscar.mockReturnValue([joana]);
    render(<ClientesPage />);
    await screen.findByText('Maria Silva');
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), 'joana');
    expect(buscar).toHaveBeenCalledWith('joana');
    expect(screen.getByText('Joana Prado')).toBeInTheDocument();
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
  });
});

describe('ClientesPage — criação', () => {
  it('cria cliente com os 4 campos e mostra na lista', async () => {
    criar.mockImplementation((c) => ({ id: 'c3', ...c }));
    render(<ClientesPage />);
    await userEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    await userEvent.type(screen.getByPlaceholderText(/nome/i), 'Cintia Nascimento');
    await userEvent.type(screen.getByPlaceholderText(/whatsapp/i), '5518988887777');
    await userEvent.type(screen.getByPlaceholderText(/instagram/i), '@cintia');
    await userEvent.type(screen.getByPlaceholderText(/endere/i), 'Rua C, 9');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    expect(criar).toHaveBeenCalledWith({
      nome: 'Cintia Nascimento',
      whatsapp: '5518988887777',
      instagram: '@cintia',
      endereco: 'Rua C, 9',
    });
    expect(await screen.findByText('Cintia Nascimento')).toBeInTheDocument();
  });

  it('não cria sem nome ou sem whatsapp e avisa obrigatório', async () => {
    render(<ClientesPage />);
    await userEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    await userEvent.type(screen.getByPlaceholderText(/instagram/i), '@x');
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(criar).not.toHaveBeenCalled();
    expect(screen.getByText(/obrigat/i)).toBeInTheDocument();
  });
});
