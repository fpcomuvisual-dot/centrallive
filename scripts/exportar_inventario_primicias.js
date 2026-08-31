import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function exportarInventario() {
  console.log("Conectando ao Firebase Firestore...");
  const snap = await getDocs(collection(db, 'sessoes'));

  const lotes2808 = [];
  let totalProdutos = 0;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const nome = data.nome || '';
    
    // Verificar se a data de criação no Firestore foi no dia 28/08 (ou se contém 2808 no nome)
    let ehDia28 = false;
    let dataFormatada = 'N/A';

    if (data.created_at && data.created_at.seconds) {
      const date = new Date(data.created_at.seconds * 1000);
      // Considerando o fuso horário local de São Paulo (UTC-3)
      const dataSpStr = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      dataFormatada = date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      if (dataSpStr.startsWith('28/08')) {
        ehDia28 = true;
      }
    }

    if (!ehDia28 && (id.includes('2808') || nome.includes('2808'))) {
      ehDia28 = true;
    }

    if (ehDia28) {
      const artes = data.artes || [];
      lotes2808.push({
        id,
        nome,
        vendedora: data.vendedora || 'vivi',
        dataCriacao: dataFormatada,
        artes
      });
      totalProdutos += artes.length;
    }
  });

  // Ordenar por horário de criação
  lotes2808.sort((a, b) => a.dataCriacao.localeCompare(b.dataCriacao));

  console.log(`Encontrados ${lotes2808.length} lotes criados estritamente em 28/08, totalizando ${totalProdutos} produtos.`);

  // Consolidar todos os itens em uma lista única
  const listaInventario = [];

  for (const lote of lotes2808) {
    lote.artes.forEach((arte, idx) => {
      listaInventario.push({
        loteId: lote.id,
        loteNome: lote.nome,
        itemIndex: idx + 1,
        sku: arte.sku || 'N/A',
        nome: arte.nome || `Item ${idx + 1}`,
        preco: arte.preco || 'N/A',
        parcelas: arte.parcelas || 'N/A',
        quantidade: arte.quantidade || 1,
        imageUrl: arte.storage_url || ''
      });
    });
  }

  // 1. Gerar CSV
  let csvContent = '\uFEFF'; // UTF-8 BOM para abrir perfeitamente no Excel
  csvContent += 'Lote;Data Upload;SKU;Nome do Produto;Preço;Parcelas;Quantidade;URL da Imagem\n';

  for (const lote of lotes2808) {
    lote.artes.forEach((arte, idx) => {
      const nomeEscapado = `"${(arte.nome || '').replace(/"/g, '""')}"`;
      const loteEscapado = `"${lote.nome.replace(/"/g, '""')}"`;
      csvContent += `${loteEscapado};${lote.dataCriacao};${arte.sku || 'N/A'};${nomeEscapado};${arte.preco || ''};${arte.parcelas || ''};${arte.quantidade || 1};${arte.storage_url || ''}\n`;
    });
  }

  const csvPath = path.resolve('inventario_primicias_2808.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`✅ CSV do inventário gerado: ${csvPath}`);

  // 2. Gerar HTML Interativo / Imprimível
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Inventário Primícias - Lotes de 28/08</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333; }
    .header { background: #2E7D5B; color: white; padding: 20px 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header h1 { margin: 0 0 8px 0; font-size: 26px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .stats-bar { display: flex; gap: 20px; background: white; padding: 15px 25px; border-radius: 10px; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .stat-item { flex: 1; }
    .stat-item .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-item .val { font-size: 22px; font-weight: bold; color: #2E7D5B; margin-top: 4px; }
    .lote-section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
    .lote-title { font-size: 18px; font-weight: bold; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fff; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .card img { width: 100%; height: 180px; object-fit: cover; background: #f1f5f9; }
    .card-body { padding: 12px; flex: 1; display: flex; flex-direction: column; }
    .card-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-sku { font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-family: monospace; display: inline-block; margin-bottom: 8px; width: fit-content; }
    .card-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
    .price { font-size: 15px; font-weight: bold; color: #16a34a; }
    .qty { font-size: 12px; font-weight: bold; background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 12px; }
    @media print {
      body { background: white; padding: 0; }
      .card { break-inside: avoid; }
      .header { background: #2E7D5B !important; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Inventário Primícias Hair</h1>
    <p>Relatório de Todos os Lotes com Upload em 28 de Agosto no Firebase</p>
  </div>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="label">Total de Lotes (28/08)</div>
      <div class="val">${lotes2808.length}</div>
    </div>
    <div class="stat-item">
      <div class="label">Total de Produtos</div>
      <div class="val">${totalProdutos}</div>
    </div>
    <div class="stat-item">
      <div class="label">Data de Upload</div>
      <div class="val">28/08/2026</div>
    </div>
  </div>

  ${lotes2808.map(lote => `
    <div class="lote-section">
      <div class="lote-title">
        <span>📦 ${lote.nome} <small style="font-weight: normal; color: #64748b; font-size: 12px;">(${lote.dataCriacao})</small></span>
        <span style="font-size: 13px; color: #64748b; font-weight: normal;">${lote.artes.length} itens</span>
      </div>
      <div class="grid">
        ${lote.artes.map((item, idx) => `
          <div class="card">
            <img src="${item.storage_url || 'https://via.placeholder.com/200?text=Sem+Foto'}" alt="${item.nome}">
            <div class="card-body">
              <div class="card-sku">${item.sku || 'SEM SKU'}</div>
              <div class="card-title">${item.nome || `Item ${idx + 1}`}</div>
              <div class="card-footer">
                <span class="price">${item.preco || 'R$ --'}</span>
                <span class="qty">Qtd: ${item.quantidade || 1}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>`;

  const htmlPath = path.resolve('inventario_primicias_2808.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`✅ Relatório HTML de Inventário gerado: ${htmlPath}`);
}

exportarInventario().then(() => process.exit(0)).catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
