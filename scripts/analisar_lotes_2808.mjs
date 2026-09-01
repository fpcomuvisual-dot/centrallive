import { artesService } from '../src/services/artes.js';

async function main() {
  const sessoes = await artesService.listarSessoes();
  console.log(`\n=== TOTAL DE SESSOES NO FIREBASE: ${sessoes.length} ===\n`);

  const sessoes2808 = [];

  for (const s of sessoes) {
    let dataStr = '';
    if (s.created_at) {
      if (typeof s.created_at.toDate === 'function') {
        dataStr = s.created_at.toDate().toLocaleString('pt-BR');
      } else if (s.created_at.seconds) {
        dataStr = new Date(s.created_at.seconds * 1000).toLocaleString('pt-BR');
      } else {
        dataStr = new Date(s.created_at).toLocaleString('pt-BR');
      }
    }

    const artesQtd = (s.artes || []).length;
    console.log(`Sessão: ${s.id} | Data: ${dataStr} | Nome/Ref: ${s.nome || s.descricao || 'Sem Nome'} | Artes: ${artesQtd}`);

    // Verificar se é do dia 28/08 (28/08/2026 ou 28/08/2024 ou no ID/data)
    if (dataStr.includes('28/08') || dataStr.includes('28/8') || (s.id && s.id.includes('2808')) || (s.nome && s.nome.includes('28/08'))) {
      sessoes2808.push({ ...s, dataStr });
    }
  }

  console.log(`\n=== LOTES IDENTIFICADOS DO DIA 28/08: ${sessoes2808.length} ===`);
  sessoes2808.forEach(s => {
    console.log(`- ID: ${s.id} | Data: ${s.dataStr} | Qtd Artes: ${(s.artes || []).length}`);
  });
}

main().catch(console.error);
