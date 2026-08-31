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

async function gerarTabelaInterativa() {
  console.log("Conectando ao Firebase Firestore...");
  const snap = await getDocs(collection(db, 'sessoes'));

  const todosProdutos = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const id = docSnap.id;
    const nome = data.nome || '';
    
    let ehDia28 = false;

    if (data.created_at && data.created_at.seconds) {
      const date = new Date(data.created_at.seconds * 1000);
      const dataSpStr = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      if (dataSpStr.startsWith('28/08')) {
        ehDia28 = true;
      }
    }

    if (!ehDia28 && (id.includes('2808') || nome.includes('2808'))) {
      ehDia28 = true;
    }

    if (ehDia28) {
      const artes = data.artes || [];
      artes.forEach((arte, idx) => {
        let precoNum = 0;
        if (arte.preco) {
          const limpo = arte.preco.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.');
          precoNum = parseFloat(limpo) || 0;
        }
        const qtd = parseInt(arte.quantidade) || 1;

        todosProdutos.push({
          docId: id,
          arteIndex: idx,
          loteNome: nome,
          sku: arte.sku || 'N/A',
          nome: arte.nome || `Produto ${idx + 1}`,
          precoRaw: arte.preco || 'R$ 0,00',
          precoNum: precoNum,
          quantidade: qtd,
          fotoUrl: arte.storage_url || 'https://via.placeholder.com/300?text=Sem+Foto'
        });
      });
    }
  });

  console.log(`Carregados ${todosProdutos.length} produtos de 28/08.`);

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo Primícias - Tabela Interativa de Estoque</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1b4332;
      --primary-gradient: linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%);
      --accent-gold: #d4af37;
      --accent-gold-light: #fef9e7;
      --bg-body: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --shadow-md: 0 10px 25px -5px rgba(27, 67, 50, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-body);
      color: var(--text-main);
      line-height: 1.6;
      padding-bottom: 60px;
    }

    .hero-header {
      background: var(--primary-gradient);
      color: white;
      padding: 45px 20px 35px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(27, 67, 50, 0.2);
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 6px 18px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #fef08a;
      margin-bottom: 12px;
    }

    .hero-header h1 {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .hero-header p {
      font-size: 15px;
      color: #d8f3dc;
      max-width: 650px;
      margin: 0 auto;
    }

    .container {
      max-width: 1200px;
      margin: -25px auto 0;
      padding: 0 20px;
      position: relative;
      z-index: 10;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 25px;
    }

    .summary-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .summary-info .label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-info .value {
      font-size: 26px;
      font-weight: 800;
      color: var(--primary);
      margin-top: 4px;
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--accent-gold-light);
      color: #b45309;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }

    .toolbar {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 16px 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-md);
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      border: 1px solid var(--border-color);
    }

    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
    }

    .search-box input {
      width: 100%;
      padding: 12px 18px 12px 42px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      font-family: inherit;
      font-size: 14px;
      background: #f8fafc;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary);
      background: white;
      box-shadow: 0 0 0 4px rgba(27, 67, 50, 0.1);
    }

    .search-box svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      width: 18px;
      height: 18px;
    }

    .btn-group {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
      box-shadow: 0 4px 12px rgba(27, 67, 50, 0.2);
    }

    .btn-primary:hover { background: #2d6a4f; }

    .btn-outline {
      background: white;
      color: var(--primary);
      border: 1px solid var(--primary);
    }

    .btn-outline:hover { background: #f0fdf4; }

    .table-card {
      background: var(--card-bg);
      border-radius: 20px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }

    .table-wrapper { overflow-x: auto; }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    thead {
      background: #f1f5f9;
      border-bottom: 2px solid var(--border-color);
    }

    th {
      padding: 18px 24px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
    }

    tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s ease;
    }

    tbody tr:hover { background-color: #f8fafc; }

    td {
      padding: 16px 24px;
      vertical-align: middle;
    }

    .col-foto { width: 100px; }

    .prod-img-box {
      width: 72px;
      height: 72px;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.08);
      cursor: pointer;
      background: #e2e8f0;
    }

    .prod-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .prod-img-box:hover img { transform: scale(1.15); }

    .prod-nome-box {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .prod-nome {
      font-weight: 700;
      font-size: 15px;
      color: #0f172a;
    }

    .prod-sku {
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 6px;
      width: fit-content;
    }

    .prod-lote {
      font-size: 11px;
      color: #047857;
      background: #ecfdf5;
      padding: 2px 8px;
      border-radius: 6px;
      width: fit-content;
      font-weight: 500;
    }

    .price-tag {
      font-size: 17px;
      font-weight: 800;
      color: #15803d;
    }

    /* Input da Quantidade Interativo */
    .qty-control {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .qty-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid #86efac;
      background: white;
      color: #166534;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .qty-btn:hover {
      background: #166534;
      color: white;
    }

    .qty-input {
      width: 50px;
      text-align: center;
      font-weight: 800;
      font-size: 15px;
      color: #15803d;
      border: none;
      background: transparent;
      outline: none;
    }

    /* Modal de Imagem */
    .img-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
      cursor: pointer;
    }

    .img-modal img {
      max-width: 90vw;
      max-height: 85vh;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }

    @media print {
      .hero-header { padding: 30px 20px; }
      .toolbar, .btn-group, .qty-btn { display: none !important; }
      .container { margin: 0; max-width: 100%; padding: 0; }
      .table-card { box-shadow: none; border: none; }
      body { background: white; }
      th, td { padding: 10px 14px; }
      .qty-control { border: none; background: transparent; }
      .qty-input { width: auto; text-align: left; }
    }
  </style>
</head>
<body>

  <header class="hero-header">
    <div class="brand-badge">✨ Primícias Hair</div>
    <h1>Tabela Interativa de Estoque</h1>
    <p>Ajuste as quantidades em tempo real — O valor total é recalculado automaticamente</p>
  </header>

  <main class="container">

    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-info">
          <div class="label">Total de Itens</div>
          <div class="value">${todosProdutos.length}</div>
        </div>
        <div class="summary-icon">📦</div>
      </div>

      <div class="summary-card">
        <div class="summary-info">
          <div class="label">Total Peças em Estoque</div>
          <div class="value" id="totalPecasVal">--</div>
        </div>
        <div class="summary-icon">✨</div>
      </div>

      <div class="summary-card">
        <div class="summary-info">
          <div class="label">Valor Total do Inventário</div>
          <div class="value" id="valorTotalVal">--</div>
        </div>
        <div class="summary-icon">🏷️</div>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" id="searchInput" placeholder="Buscar produto pelo nome ou SKU..." onkeyup="filtrarTabela()">
      </div>

      <div class="btn-group">
        <button class="btn btn-outline" onclick="exportarCSVAtualizado()">
          📊 Baixar CSV Atualizado
        </button>

        <button class="btn btn-primary" onclick="window.print()">
          🖨️ Imprimir / PDF
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-wrapper">
        <table id="produtosTable">
          <thead>
            <tr>
              <th class="col-foto">Foto</th>
              <th>Produto</th>
              <th>Preço Unit.</th>
              <th style="text-align: center;">Quantidade</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${todosProdutos.map((p, idx) => `
              <tr class="item-row" data-preco="${p.precoNum}">
                <td class="col-foto">
                  <div class="prod-img-box" onclick="abrirFoto('${p.fotoUrl}', '${p.nome.replace(/'/g, "\\'")}')">
                    <img src="${p.fotoUrl}" alt="${p.nome}" loading="lazy">
                  </div>
                </td>
                <td>
                  <div class="prod-nome-box">
                    <span class="prod-nome">${p.nome}</span>
                    <div style="display: flex; gap: 6px; align-items: center; margin-top: 4px;">
                      <span class="prod-sku">SKU: ${p.sku}</span>
                      <span class="prod-lote">${p.loteNome}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="price-tag">${p.precoRaw}</span>
                </td>
                <td style="text-align: center;">
                  <div class="qty-control">
                    <button type="button" class="qty-btn" onclick="alterarQtd(${idx}, -1)">-</button>
                    <input type="number" id="qty-${idx}" class="qty-input" value="${p.quantidade}" min="1" onchange="atualizarTotais()">
                    <button type="button" class="qty-btn" onclick="alterarQtd(${idx}, 1)">+</button>
                  </div>
                </td>
                <td style="text-align: right; font-weight: 800; color: #1e293b;" id="subtotal-${idx}">
                  R$ 0,00
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </main>

  <div class="img-modal" id="imgModal" onclick="fecharFoto()">
    <img id="modalImg" src="" alt="Ampliação">
  </div>

  <script>
    const PRODUTOS_DATA = ${JSON.stringify(todosProdutos)};

    function carregarQuantidadesSalvas() {
      const salvas = localStorage.getItem('primicias_quantidades_2808');
      if (salvas) {
        try {
          const map = JSON.parse(salvas);
          PRODUTOS_DATA.forEach((p, idx) => {
            if (map[p.sku] !== undefined) {
              p.quantidade = map[p.sku];
              const el = document.getElementById('qty-' + idx);
              if (el) el.value = p.quantidade;
            }
          });
        } catch(e) {}
      }
      atualizarTotais();
    }

    function alterarQtd(idx, delta) {
      const el = document.getElementById('qty-' + idx);
      if (!el) return;
      let val = (parseInt(el.value) || 1) + delta;
      if (val < 1) val = 1;
      el.value = val;
      atualizarTotais();
    }

    function atualizarTotais() {
      let totalPecas = 0;
      let valorTotal = 0;
      const mapSalvar = {};

      PRODUTOS_DATA.forEach((p, idx) => {
        const el = document.getElementById('qty-' + idx);
        const qtd = el ? Math.max(1, parseInt(el.value) || 1) : p.quantidade;
        p.quantidade = qtd;
        mapSalvar[p.sku] = qtd;

        const subtotal = p.precoNum * qtd;
        totalPecas += qtd;
        valorTotal += subtotal;

        const subEl = document.getElementById('subtotal-' + idx);
        if (subEl) {
          subEl.innerText = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
      });

      document.getElementById('totalPecasVal').innerText = totalPecas + ' un.';
      document.getElementById('valorTotalVal').innerText = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      localStorage.setItem('primicias_quantidades_2808', JSON.stringify(mapSalvar));
    }

    function abrirFoto(url, nome) {
      document.getElementById('modalImg').src = url;
      document.getElementById('imgModal').style.display = 'flex';
    }

    function fecharFoto() {
      document.getElementById('imgModal').style.display = 'none';
    }

    function filtrarTabela() {
      const filter = document.getElementById('searchInput').value.toLowerCase().trim();
      const trs = document.getElementsByClassName('item-row');
      for (let i = 0; i < trs.length; i++) {
        trs[i].style.display = trs[i].textContent.toLowerCase().includes(filter) ? '' : 'none';
      }
    }

    function exportarCSVAtualizado() {
      let csv = '\\uFEFFLote;SKU;Nome do Produto;Preço Unitário;Quantidade;Subtotal;Foto URL\\n';
      PRODUTOS_DATA.forEach(p => {
        const sub = (p.precoNum * p.quantidade).toFixed(2).replace('.', ',');
        csv += '"' + p.loteNome.replace(/"/g, '""') + '";' + p.sku + ';"' + p.nome.replace(/"/g, '""') + '";' + p.precoRaw + ';' + p.quantidade + ';R$ ' + sub + ';' + p.fotoUrl + '\\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "inventario_primicias_2808_atualizado.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    window.onload = carregarQuantidadesSalvas;
  </script>
</body>
</html>`;

  const indexPath = path.resolve('index.html');
  fs.writeFileSync(indexPath, htmlContent, 'utf-8');
  console.log(`✅ Tabela interativa regerada em: ${indexPath}`);
}

gerarTabelaInterativa().then(() => process.exit(0)).catch(e => {
  console.error("Erro:", e);
  process.exit(1);
});
