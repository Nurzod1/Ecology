// Утилита для поиска названия района по коду district

let districtDataCache: any = null;

export const loadDistrictData = async (): Promise<any> => {
  if (districtDataCache) {
    return districtDataCache;
  }

  const origin = window.location.origin;
  const baseUrl = (window as any).jimuConfig?.baseUrl || '';
  const pathsToTry = [
    `${origin}/widgets/Custom-map-widget/dist/runtime/districtttt.json`,
    `${baseUrl}/widgets/Custom-map-widget/dist/runtime/districtttt.json`,
    './districtttt.json',
    './dist/runtime/districtttt.json',
    './src/runtime/districtttt.json'
  ];

  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const data = await response.json();
        if (data?.features?.length) {
          districtDataCache = data;
          return data;
        }
      }
    } catch (error) {
      console.warn('[Custom-map-widget] Failed to load district data from:', path);
    }
  }

  return null;
};

export const getDistrictName = async (districtCode: string, locale?: string): Promise<string | null> => {
  try {
    const data = await loadDistrictData();
    if (!data || !data.features) {
      return null;
    }

    const feature = data.features.find((f: any) => {
      const attrs = f.attributes || {};
      const district = String(attrs.district || '');
      const soato = String(attrs.soato || '');
      return district === districtCode || soato === districtCode;
    });

    if (feature) {
      const attrs = feature.attributes || {};
      const currentLocale = locale || localStorage.getItem('customLocal') || 'ru';
      const localeKey = currentLocale === 'uz-Cyrl' ? 'uz-Cyrl' : currentLocale === 'uz-Latn' ? 'uz-Latn' : 'ru';
      
      // Пытаемся получить локализованное название
      // Если есть поля для локализации, используем их
      if (attrs[`nomi_${localeKey}`]) {
        return attrs[`nomi_${localeKey}`];
      }
      if (attrs[localeKey]) {
        return attrs[localeKey];
      }
      
      // Если локализованного названия нет, используем nomi_lot и преобразуем его
      const nomiLot = attrs.nomi_lot || '';
      if (nomiLot) {
        // Для русской локали можно попробовать преобразовать или вернуть как есть
        // Для кириллицы можно использовать транслитерацию
        if (localeKey === 'ru') {
          // Можно добавить словарь преобразований или вернуть как есть
          return nomiLot;
        } else if (localeKey === 'uz-Cyrl') {
          // Преобразуем латиницу в кириллицу (базовая транслитерация)
          return transliterateToCyrillic(nomiLot);
        } else {
          // uz-Latn - возвращаем как есть
          return nomiLot;
        }
      }
      
      return null;
    }

    return null;
  } catch (error) {
    console.error('[Custom-map-widget] Error getting district name:', error);
    return null;
  }
};

// Функция для транслитерации латиницы в кириллицу
const transliterateToCyrillic = (text: string): string => {
  const translitMap: { [key: string]: string } = {
    'a': 'а', 'b': 'б', 'd': 'д', 'e': 'е', 'f': 'ф', 'g': 'г', 'h': 'ҳ',
    'i': 'и', 'j': 'ж', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о',
    'p': 'п', 'q': 'қ', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'v': 'в',
    'x': 'х', 'y': 'й', 'z': 'з', 'ch': 'ч', 'sh': 'ш', 'ng': 'нг', 'o\'': 'ў',
    'g\'': 'ғ', '`': 'ъ'
  };
  
  let result = text.toLowerCase();
  // Простая транслитерация (можно улучшить)
  for (const [lat, cyrl] of Object.entries(translitMap)) {
    result = result.replace(new RegExp(lat, 'g'), cyrl);
  }
  
  // Первая буква заглавная
  return result.charAt(0).toUpperCase() + result.slice(1);
};
