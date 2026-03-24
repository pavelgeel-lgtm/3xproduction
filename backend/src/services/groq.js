const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `Ты — система анализа кинопроизводственных документов.
Разбери КПП или сценарий и верни строго JSON по схеме ниже.
Для каждой позиции укажи: name, scene, day, time, location, qty, source (kpp|scenario|ai), note.
В cross_check укажи расхождения между КПП и сценарием, пропущенные позиции и сквозные единицы.
Отвечай ТОЛЬКО JSON, без markdown, без преамбулы, без объяснений.

Схема:
{
  "props": [{ "name": "string", "scene": "string", "day": "string", "time": "string", "location": "string", "qty": 1, "source": "kpp|scenario|ai", "note": "string" }],
  "costumes": [...same...],
  "decoration": [...same...],
  "makeup": [...same...],
  "stunts": [...same...],
  "pyrotechnics": [...same...],
  "auto": [...same...],
  "ai_suggestions": [{ "category": "string", "item": "string", "reason": "string" }],
  "cross_check": {
    "discrepancies": ["string"],
    "missing": ["string"],
    "cross_items": ["string"]
  }
}`

async function parseDocument(text) {
  const resp = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Документ для анализа:\n\n${text.slice(0, 12000)}` },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Groq error: ${err}`)
  }

  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Strip any accidental markdown fences
  const clean = content.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim()
  return JSON.parse(clean)
}

// Compute delta between two parsed_data JSONs
function computeDelta(oldData, newData) {
  const delta = { added: [], changed: [], removed: [] }
  const categories = ['props', 'costumes', 'decoration', 'makeup', 'stunts', 'pyrotechnics', 'auto']

  for (const cat of categories) {
    const oldItems = (oldData?.[cat] || [])
    const newItems = (newData?.[cat] || [])

    const oldMap = Object.fromEntries(oldItems.map(i => [i.name, i]))
    const newMap = Object.fromEntries(newItems.map(i => [i.name, i]))

    for (const name of Object.keys(newMap)) {
      if (!oldMap[name]) {
        delta.added.push({ category: cat, item: name })
      } else if (JSON.stringify(oldMap[name]) !== JSON.stringify(newMap[name])) {
        delta.changed.push({ category: cat, item: name, old: oldMap[name], new: newMap[name] })
      }
    }
    for (const name of Object.keys(oldMap)) {
      if (!newMap[name]) delta.removed.push({ category: cat, item: name })
    }
  }

  return delta
}

module.exports = { parseDocument, computeDelta }
