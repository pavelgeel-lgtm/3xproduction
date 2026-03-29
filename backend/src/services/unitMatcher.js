const db = require('../db')

/**
 * Match props and costumes from parsed document against warehouse units.
 * Returns array of { text, unit_id, unit_name, unit_status, category, photo_url }
 */
async function matchUnits(parsedContent, projectId) {
  if (!parsedContent || !parsedContent.scenes) return []

  // Collect all unique prop/costume strings
  const allItems = new Set()
  for (const scene of parsedContent.scenes) {
    for (const p of (scene.props || [])) allItems.add(p.toLowerCase().trim())
    for (const c of (scene.costumes || [])) allItems.add(c.toLowerCase().trim())
  }

  if (allItems.size === 0) return []

  // Fetch all units from warehouse
  const { rows: units } = await db.query(
    `SELECT u.id, u.name, u.status, u.category, u.qty,
            (SELECT url FROM unit_photos WHERE unit_id = u.id ORDER BY created_at LIMIT 1) AS photo_url
     FROM units u
     WHERE u.status != 'written_off'`
  )

  if (!units.length) return []

  const matched = []
  const seen = new Set()

  for (const itemText of allItems) {
    for (const unit of units) {
      const unitName = unit.name.toLowerCase()
      // Match if unit name is contained in item text or vice versa
      // (e.g., item "досье на Филю" matches unit "досье", or item "нож" matches unit "нож кухонный")
      const isMatch = unitName.includes(itemText) ||
                       itemText.includes(unitName) ||
                       fuzzyMatch(itemText, unitName)

      if (isMatch) {
        const key = `${itemText}::${unit.id}`
        if (seen.has(key)) continue
        seen.add(key)

        matched.push({
          text: itemText,
          unit_id: unit.id,
          unit_name: unit.name,
          unit_status: unit.status,
          unit_category: unit.category,
          unit_qty: unit.qty,
          photo_url: unit.photo_url,
        })
      }
    }
  }

  return matched
}

/**
 * Simple fuzzy match: split both strings into words and check overlap
 */
function fuzzyMatch(a, b) {
  const wordsA = a.split(/\s+/).filter(w => w.length > 2)
  const wordsB = b.split(/\s+/).filter(w => w.length > 2)
  if (wordsA.length === 0 || wordsB.length === 0) return false

  let matches = 0
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb || wa.startsWith(wb) || wb.startsWith(wa)) {
        matches++
        break
      }
    }
  }
  // At least one significant word must match
  return matches > 0 && matches >= Math.min(wordsA.length, wordsB.length) * 0.5
}

module.exports = { matchUnits }
