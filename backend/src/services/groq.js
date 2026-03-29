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
      max_tokens: 8192,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Groq error: ${err}`)
  }

  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content || ''
  const finishReason = data.choices?.[0]?.finish_reason

  if (!content) {
    console.error('Groq returned empty content, finish_reason:', finishReason)
    throw new Error('Groq returned empty response')
  }

  // Strip any accidental markdown fences
  let clean = content.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim()

  // If response was truncated (length limit), try to fix JSON
  if (finishReason === 'length') {
    console.warn('Groq response truncated, attempting JSON repair')
    // Close any open arrays/objects
    let opens = 0, openArr = 0
    for (const ch of clean) {
      if (ch === '{') opens++
      if (ch === '}') opens--
      if (ch === '[') openArr++
      if (ch === ']') openArr--
    }
    while (openArr > 0) { clean += ']'; openArr-- }
    while (opens > 0) { clean += '}'; opens-- }
  }

  try {
    return JSON.parse(clean)
  } catch (err) {
    console.error('Groq JSON parse failed, first 500 chars:', clean.substring(0, 500))
    console.error('Last 200 chars:', clean.substring(clean.length - 200))
    throw err
  }
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
