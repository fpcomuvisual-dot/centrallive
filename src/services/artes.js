import { collection, doc, getDocs, getDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase.js';

export const artesService = {
  async listarSessoes() {
    const coll = collection(db, 'sessoes');
    const q = query(coll, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async vincularSku(sessaoId, arteIndex, sku) {
    const docRef = doc(db, 'sessoes', sessaoId);
    const snap = await getDoc(docRef);
    const artes = snap.data().artes.map((a, i) =>
      i === arteIndex ? { ...a, sku } : a
    );
    await updateDoc(docRef, { artes });
  },

  async buscarImagemPorSku(sku) {
    if (!sku) return null;
    const sessoes = await artesService.listarSessoes();
    for (const sessao of sessoes) {
      const arte = (sessao.artes || []).find((a) => (a.sku && a.sku === sku) || a.nome === sku);
      if (arte) return arte.storage_url;
    }
    return null;
  },

  async excluirArtes(sessaoId, indicesParaRemover) {
    const docRef = doc(db, 'sessoes', sessaoId);
    const snap = await getDoc(docRef);
    const artes = snap.data().artes.filter(
      (_, i) => !indicesParaRemover.includes(i)
    );
    await updateDoc(docRef, { artes });
  },

  async excluirSessao(sessaoId) {
    const { deleteDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'sessoes', sessaoId);
    await deleteDoc(docRef);
  },
};
