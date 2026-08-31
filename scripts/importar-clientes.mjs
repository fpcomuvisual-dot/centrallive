import { readFileSync, existsSync } from 'fs';

let envUrl = process.env.VITE_ERP_BASE_URL;
if (!envUrl && existsSync('./.env')) {
  const envContent = readFileSync('./.env', 'utf-8');
  const match = envContent.match(/^VITE_ERP_BASE_URL=(.+)$/m);
  if (match) envUrl = match[1].trim();
}

const ERP_BASE = envUrl || 'https://trio-gestao-api-356056496893.us-central1.run.app/api/v1';
const VCF_PATH = './scripts/contatos.vcf';

const vcf = readFileSync(VCF_PATH, 'utf-8');
const cards = vcf.split('END:VCARD').filter(c =>
  c.includes('BEGIN:VCARD')
);

const contatos = [];
for (const card of cards) {
  const nomeMatch = card.match(/^FN:(.+)$/m);
  const telMatch = card.match(/TEL[^:]*:(.+)$/m);
  if (!nomeMatch || !telMatch) continue;

  const nome = nomeMatch[1].trim();
  const whatsapp = telMatch[1].trim()
    .replace(/[\s\-\(\)]/g, '');

  if (nome && whatsapp) contatos.push({ nome, whatsapp });
}

console.log(`📋 ${contatos.length} contatos encontrados`);

let criados = 0, duplicatas = 0, falhas = 0;

for (const contato of contatos) {
  try {
    const res = await fetch(`${ERP_BASE}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contato),
    });

    if (res.status === 201 || res.status === 200) {
      criados++;
      console.log(`✅ ${contato.nome}`);
    } else if (res.status === 409) {
      duplicatas++;
      console.log(`⚠️  Duplicata: ${contato.nome}`);
    } else {
      falhas++;
      console.log(`❌ Falhou: ${contato.nome} (${res.status})`);
    }
  } catch (err) {
    falhas++;
    console.log(`❌ Erro: ${contato.nome} — ${err.message}`);
  }

  // Delay de 100ms entre requests pra não sobrecarregar
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\n📊 RESULTADO:`);
console.log(`  ✅ Criados:    ${criados}`);
console.log(`  ⚠️  Duplicatas: ${duplicatas}`);
console.log(`  ❌ Falhas:     ${falhas}`);
