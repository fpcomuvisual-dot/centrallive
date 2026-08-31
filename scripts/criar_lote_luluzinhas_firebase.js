import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
const storage = getStorage(app);

const IMG_DIR = "X:\\Dev\\TEXTOJOIA\\erp3marias\\tresmarias\\public\\camisetas";

const ITEMS = [
  { sku: "4782-P",  cor: "MARINHO",   tam: "P",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Marinho Personalizada (Azul).jpg" },
  { sku: "4782-M",  cor: "MARINHO",   tam: "M",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Marinho Personalizada (Azul).jpg" },
  { sku: "4782-G",  cor: "MARINHO",   tam: "G",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Marinho Personalizada (Azul).jpg" },
  { sku: "4782-GG", cor: "MARINHO",   tam: "GG", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Marinho Personalizada (Azul).jpg" },
  { sku: "4782-G1", cor: "MARINHO",   tam: "G1", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Marinho Personalizada (Azul).jpg" },
  
  { sku: "3578-P",  cor: "BRANCO",    tam: "P",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Branca Personalizada.jpg" },
  { sku: "3579-M",  cor: "BRANCO",    tam: "M",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Branca Personalizada.jpg" },
  { sku: "3580-G",  cor: "BRANCO",    tam: "G",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Branca Personalizada.jpg" },
  { sku: "3581-GG", cor: "BRANCO",    tam: "GG", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Branca Personalizada.jpg" },
  { sku: "3577-G2", cor: "BRANCO",    tam: "G2", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Branca Personalizada.jpg" },

  { sku: "4789-P",  cor: "CHOCOLATE", tam: "P",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Chocolate Personalizada (Marrom).jpg" },
  { sku: "4789-M",  cor: "CHOCOLATE", tam: "M",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Chocolate Personalizada (Marrom).jpg" },
  { sku: "4789-G",  cor: "CHOCOLATE", tam: "G",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Chocolate Personalizada (Marrom).jpg" },
  { sku: "4789-GG", cor: "CHOCOLATE", tam: "GG", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Chocolate Personalizada (Marrom).jpg" },
  { sku: "4789-G2", cor: "CHOCOLATE", tam: "G2", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Chocolate Personalizada (Marrom).jpg" },

  { sku: "3583-P",  cor: "PRETO",     tam: "P",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Preta Personalizada.jpg" },
  { sku: "3584-M",  cor: "PRETO",     tam: "M",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Preta Personalizada.jpg" },
  { sku: "3585-G",  cor: "PRETO",     tam: "G",  preco: "R$ 69,90", parcelas: "3x R$ 23,30", img: "T-shirt Feminina Preta Personalizada.jpg" },
  { sku: "3586-GG", cor: "PRETO",     tam: "GG", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Preta Personalizada.jpg" },
  { sku: "3582-G2", cor: "PRETO",     tam: "G2", preco: "R$ 79,90", parcelas: "3x R$ 26,63", img: "T-shirt Feminina Preta Personalizada.jpg" }
];

async function main() {
  const sessaoId = "lote_luluzinhas_camisetas";
  const urlCache = {};
  const artesMetadata = [];

  console.log("Starting Firebase upload for Luluzinhas batch...");

  for (const item of ITEMS) {
    const fileImgPath = path.join(IMG_DIR, item.img);
    let downloadURL = urlCache[item.img];
    const storagePath = `sessoes/${sessaoId}/${item.sku}.jpg`;

    if (!downloadURL) {
      if (fs.existsSync(fileImgPath)) {
        console.log(`Uploading ${item.img} to Firebase Storage...`);
        const fileBuffer = fs.readFileSync(fileImgPath);
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, fileBuffer, { contentType: 'image/jpeg' });
        downloadURL = await getDownloadURL(storageRef);
        urlCache[item.img] = downloadURL;
        console.log(`Uploaded! URL: ${downloadURL.substring(0, 60)}...`);
      } else {
        console.warn(`File not found: ${fileImgPath}`);
      }
    }

    artesMetadata.push({
      nome: `T-shirt Feminina Personalizada ${item.cor} ${item.tam}`,
      preco: item.preco,
      quantidade: item.quantidade || 1,
      sku: item.sku,
      storage_path: storagePath,
      storage_url: downloadURL || ""
    });
  }

  // Create document in Firestore
  const docRef = doc(db, 'sessoes', sessaoId);
  await setDoc(docRef, {
    nome: "Camisetas Cianitas Luluzinhas",
    vendedora: "luluzinhas",
    created_at: serverTimestamp(),
    total_artes: artesMetadata.length,
    artes: artesMetadata
  });

  console.log(`SUCCESS! Firestore document '${sessaoId}' created with ${artesMetadata.length} artes!`);
  process.exit(0);
}

main().catch(err => {
  console.error("FAILED:", err);
  process.exit(1);
});
