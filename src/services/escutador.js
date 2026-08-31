export async function processarTranscricao(textoTranscrito) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  const prompt = `Você é um assistente especializado em lives de
venda de semijoias brasileiras. Analise a transcrição abaixo e
extraia APENAS os eventos de venda.

PADRÕES QUE INDICAM PEDIDO (exemplos reais):
- "já separei pra [nome]"
- "um pra [nome] da [peça]"
- "reserva uma pra [nome]"
- "esse é dela" (quando precedido de nome)
- "[nome] ficou com o/a [peça]"
- "[nome] pegou"
- "pra [nome] [peça]"

PADRÕES QUE INDICAM CANCELAMENTO OU TROCA:
- "desistiu", "não quer mais", "pode trocar", "troca pra"

REGRAS:
- Inclua SOMENTE eventos com nome de cliente identificável + peça
- Ignore apresentação de produtos sem pedido, conversa motivacional,
  avisos gerais
- O timestamp vem no formato "(MM:SS)" ou "(HH:MM:SS)" na linha
  acima do evento — capture-o
- Se não houver timestamp claro, use ""
- Retorne SOMENTE JSON válido, sem markdown, sem explicação,
  sem texto antes ou depois

FORMATO DE SAÍDA:
[
  {
    "timestamp": "08:14",
    "cliente": "Nome como falado pela Vivi",
    "acao": "pedido",
    "descricao": "descrição da peça como falada"
  },
  {
    "timestamp": "10:43",
    "cliente": "Nome",
    "acao": "cancelamento",
    "descricao": "peça cancelada"
  }
]

Transcrição:
${textoTranscrito}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);

  const data = await res.json();
  const texto = data.choices?.[0]?.message?.content ?? '[]';

  // Remove possíveis marcadores markdown que o Groq às vezes insere
  const limpo = texto.replace(/```json|```/g, '').trim();
  return JSON.parse(limpo);
}
