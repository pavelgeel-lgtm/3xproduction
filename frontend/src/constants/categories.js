// Единый словарь категорий: ключ (БД) → русское название
export const CATEGORY_MAP = {
  costumes:  'Костюмы',
  props:     'Реквизит',
  art_fill:  'Художественное наполнение',
  dummy:     'Бутафория',
  auto:      'Автомобили',
  furniture: 'Мебель',
  decor:     'Декор',
  scenery:   'Декорации',
  tech:      'Техника',
  lighting:  'Осветительное оборудование',
  sound:     'Звуковое оборудование',
  camera:    'Камерное оборудование',
  makeup:    'Грим и косметика',
  clothing:  'Одежда',
  jewelry:   'Украшения',
  other:     'Прочее',
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_MAP)
export const ALL_CATEGORIES_RU = Object.values(CATEGORY_MAP)
export const CATEGORIES_FILTER = ['all', ...ALL_CATEGORIES]

export const categoryLabel = (key) => CATEGORY_MAP[key] || key
export const categoryKey = (label) => Object.keys(CATEGORY_MAP).find(k => CATEGORY_MAP[k] === label) || label
