import { doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/services/firebase.js';
import { artesService } from '../src/services/artes.js';

async function unificarLotes2808() {
  const sessoes = await artesService.listarSessoes();
  const sessoes2808 = sessoes.filter(s => {
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
    return dataStr.includes('28/08') || dataStr.includes('28/8') || (s.id && s.id.includes('2808'));
  });

  console.log(`\nEncontradas ${sessoes2808.length} sessões do dia 28/08.`);

  // Mapa para deduplicar ou unir todas as artes
  const todasArtes = [];
  const skusVistos = new Set();
  const idsOriginais = [];

  for (const s of sessoes2808) {
    idsOriginais.push(s.id);
    const artes = s.artes || [];
    for (const a of artes) {
      // Identificador único (sku ou storage_url ou nome)
      const chave = a.sku || a.storage_url || a.nome;
      if (!skusVistos.has(chave)) {
        skusVistos.add(chave);
        todasArtes.push(a);
      } else {
        // Se já existe, encontrar e somar quantidade ou mesclar
        const existente = todasArtes.find(x => (x.sku && x.sku === a.sku) || x.storage_url === a.storage_url || x.nome === a.nome);
        if (existente && a.quantidade) {
          existente.quantidade = (existente.quantidade || 1) + (a.quantidade || 1);
        }
      }
    }
  }

  console.log(`\nTotal de artes unificadas únicas: ${todasArtes.length}`);
  console.log(`Sessões originais a consolidar:`, idsOriginais);

  // Novo Lote Unificado
  const novoId = 'lote-2808-unificado';
  const novoDoc = {
    nome: 'Lote 28/08 - Geral Consolidado',
    descricao: 'Todos os lotes do dia 28/08 reunidos em um único lote',
    created_at: Timestamp.fromDate(new Date('2026-08-28T18:00:00Z')),
    artes: todasArtes,
    total_artes: todasArtes.length,
  };

  console.log(`\nSalvando novo documento '${novoId}' no Firestore...`);
  await setDoc(doc(db, 'sessoes', novoId), novoDoc);
  console.log(`✅ Lote unificado salvo com sucesso com ${todasArtes.length} peças!`);

  // Remover os 10 lotes antigos fragmentados
  console.log(`\nRemovendo as ${idsOriginais.length} sessões fragmentadas antigas...`);
  for (const id of idsOriginais) {
    if (id !== novoId) {
      await deleteDoc(doc(db, 'sessoes', id));
      console.log(`🗑️ Removida sessão fragmentada: ${id}`);
    }
  }

  console.log(`\n🎉 CONSOLIDAÇÃO CONCLUÍDA COM SUCESSO NO SERVIDOR!`);
}

unificarLotes2808().catch(console.error);
