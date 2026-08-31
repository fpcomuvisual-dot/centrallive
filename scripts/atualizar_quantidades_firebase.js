import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "precificaai-vivi-9b5f6.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "precificaai-vivi-9b5f6",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "precificaai-vivi-9b5f6.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "139370645736",
  appId: process.env.FIREBASE_APP_ID || "1:139370645736:web:1c32b62fe712470e4b615d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Função para atualizar as quantidades das artes no Firestore em lote.
 * @param {Object<string, number>} mapaQuantidadesSku Exemplo: { "PCMTDCV58KBZ5": 12, "PCMTDCV7U6SQ5": 9 }
 */
export async function atualizarQuantidadesFirestore(mapaQuantidadesSku) {
  console.log("Iniciando atualização de quantidades no Firestore...");
  
  // Buscar todas as sessoes do dia 28/08
  const { collection, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, 'sessoes'));

  let alterados = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const artes = data.artes || [];
    let modificado = false;

    const novasArtes = artes.map(arte => {
      if (arte.sku && mapaQuantidadesSku[arte.sku] !== undefined) {
        modificado = true;
        alterados++;
        return { ...arte, quantidade: mapaQuantidadesSku[arte.sku] };
      }
      return arte;
    });

    if (modificado) {
      await updateDoc(doc(db, 'sessoes', docSnap.id), { artes: novasArtes });
      console.log(`Lote '${data.nome}' atualizado!`);
    }
  }

  console.log(`✅ Sucesso! ${alterados} produtos tiveram sua quantidade atualizada no Firebase.`);
}
