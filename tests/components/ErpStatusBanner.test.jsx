// tests/components/ErpStatusBanner.test.jsx
// CONTRATO do src/components/ErpStatusBanner.jsx
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// Props: { online: boolean }
// - online=true  → não renderiza nada (null)
// - online=false → banner com texto contendo "ERP offline" e
//   "carrinhos suspensos", com role="alert" (acessibilidade)

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErpStatusBanner from '../../src/components/ErpStatusBanner.jsx';

describe('ErpStatusBanner', () => {
  it('não renderiza nada quando online', () => {
    const { container } = render(<ErpStatusBanner online={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra alerta quando offline', () => {
    render(<ErpStatusBanner online={false} />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent(/ERP offline/i);
    expect(banner).toHaveTextContent(/carrinhos suspensos/i);
  });
});
