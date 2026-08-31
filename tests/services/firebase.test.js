// tests/services/firebase.test.js
// CONTRATO do src/services/firebase.js
// TERRITÓRIO DO ENGINEERING MANAGER — programador não edita.
//
// firebase.js exporta `db` (Firestore) e `storage` (Storage) do
// projeto precificaai-vivi-9b5f6. Teste estrutural — sem rede.
// Os SDKs do Firebase são mockados AQUI (permitido: firebase é
// dependência externa, não é o módulo sob teste — o que testamos
// é a configuração que o nosso módulo passa pra ela).

import { describe, it, expect, vi } from 'vitest';

const initializeApp = vi.fn(() => ({ __app: true }));
const getFirestore = vi.fn(() => ({ __db: true }));
const getStorage = vi.fn(() => ({ __storage: true }));

vi.mock('firebase/app', () => ({ initializeApp }));
vi.mock('firebase/firestore', () => ({ getFirestore }));
vi.mock('firebase/storage', () => ({ getStorage }));

const mod = await import('../../src/services/firebase.js');

describe('firebase.js', () => {
  it('inicializa com o projeto precificaai-vivi-9b5f6', () => {
    expect(initializeApp).toHaveBeenCalledTimes(1);
    const config = initializeApp.mock.calls[0][0];
    expect(config.projectId).toBe('precificaai-vivi-9b5f6');
    expect(config.storageBucket).toBe('precificaai-vivi-9b5f6.firebasestorage.app');
    expect(config.appId).toBe('1:139370645736:web:1c32b62fe712470e4b615d');
  });

  it('exporta db e storage criados a partir do app', () => {
    expect(mod.db).toEqual({ __db: true });
    expect(mod.storage).toEqual({ __storage: true });
    expect(getFirestore).toHaveBeenCalledWith({ __app: true });
    expect(getStorage).toHaveBeenCalledWith({ __app: true });
  });

  it('NÃO exporta analytics (peso desnecessário)', () => {
    expect(mod.analytics).toBeUndefined();
  });
});
