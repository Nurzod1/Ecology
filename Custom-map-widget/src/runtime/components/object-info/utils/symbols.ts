// Утилиты для создания символов полигонов

// Кастомная функция easing для плавной и красивой анимации (cubic ease-in-out)
export const smoothEasing = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const createVerticalGradientDataUrl = (start: string, end: string, opacity: number = 1): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Применяем прозрачность к цветам
    const applyOpacity = (color: string, alpha: number): string => {
      // Если цвет в формате #rrggbb, конвертируем в rgba
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return color;
    };
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, applyOpacity(start, opacity));
    gradient.addColorStop(1, applyOpacity(end, opacity));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas.toDataURL('image/png');
};

// Функция для получения цвета заливки и обводки на основе типа
export const getColorsByType = (type: number | string | null | undefined): { fillColor: string; outlineColor: [number, number, number, number] } => {
  let fillColor = '#ef4444'; // Красный по умолчанию
  let outlineColor: [number, number, number, number] = [150, 30, 30, 0.9]; // Темно-красный по умолчанию
  
  const typeValue = type !== undefined && type !== null ? Number(type) : null;
  
  if (typeValue === 0) {
    fillColor = '#3b82f6';
    outlineColor = [30, 64, 175, 0.5];
  } else if (typeValue === 1) {
    fillColor = '#f97316';
    outlineColor = [194, 65, 12, 0.9];
  } else if (typeValue === 2) {
    fillColor = '#1e3a8a';
    outlineColor = [30, 58, 138, 0.9];
  } else if (typeValue === 3) {
    fillColor = '#ef4444';
    outlineColor = [150, 30, 30, 0.9];
  } else if (typeValue === 4) {
    fillColor = '#22c55e';
    outlineColor = [20, 83, 45, 0.9];
  }
  
  return { fillColor, outlineColor };
};

// Функция для затемнения цвета (уменьшает яркость на 30%)
const darkenColor = (color: string): [number, number, number] => {
  // Конвертируем hex в RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Затемняем на 30% (умножаем на 0.7)
  return [
    Math.round(r * 0.7),
    Math.round(g * 0.7),
    Math.round(b * 0.7)
  ];
};

export const createDefaultMockSymbol = (zoom?: number, cache?: Map<string, any>, type?: number | string | null): any => {
  // Чем меньше зум, тем толще обводка
  // При зуме 10 - обводка 1.5, при зуме 5 - обводка 4, при зуме 1 - обводка 8
  const baseWidth = 1.5;
  const maxWidth = 8;
  let outlineWidth = baseWidth;
  
  // Получаем цвета на основе типа используя общую функцию
  const { fillColor, outlineColor } = getColorsByType(type);
  
  const typeValue = type !== undefined && type !== null ? Number(type) : null;
  
  if (zoom !== undefined) {
    // Округляем зум для кеширования (уменьшаем количество уникальных символов)
    const roundedZoom = Math.round(zoom * 2) / 2; // Округляем до 0.5
    
    // Создаем ключ кеша с учетом типа
    const cacheKey = `${roundedZoom}_${typeValue ?? 'null'}`;
    
    // Проверяем кеш
    if (cache?.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    // Инвертируем зум: чем меньше зум, тем больше ширина
    // zoom от 1 до 20, при zoom=20 -> width=1.5, при zoom=1 -> width=8
    const normalizedZoom = Math.max(1, Math.min(20, roundedZoom));
    outlineWidth = baseWidth + (maxWidth - baseWidth) * (1 - (normalizedZoom - 1) / 19);
  }
  
  // Для неактивного типа (0) используем более прозрачный заливку
  const fillOpacity = typeValue === 0 ? 0.4 : 0.7;
  const url = createVerticalGradientDataUrl(fillColor, fillColor, fillOpacity);
  const symbol = {
    type: 'picture-fill',
    url,
    width: 8,
    height: 8,
    outline: {
      color: outlineColor,
      width: outlineWidth
    },
    xscale: 1,
    yscale: 1
  };
  
  // Кешируем символ
  if (zoom !== undefined && cache) {
    const roundedZoom = Math.round(zoom * 2) / 2;
    const cacheKey = `${roundedZoom}_${typeValue ?? 'null'}`;
    cache.set(cacheKey, symbol);
  }
  
  return symbol;
};

export const createActiveMockSymbol = (type?: number | string | null): any => {
  // Получаем цвета на основе типа полигона
  const { fillColor, outlineColor } = getColorsByType(type);
  
  // Затемняем цвет заливки
  const darkenedFill = darkenColor(fillColor);
  
  // Затемняем цвет обводки (уже в формате RGB)
  const darkenedOutline: [number, number, number, number] = [
    Math.round(outlineColor[0] * 0.7),
    Math.round(outlineColor[1] * 0.7),
    Math.round(outlineColor[2] * 0.7),
    outlineColor[3] // Сохраняем прозрачность
  ];
  
  return {
    type: 'simple-fill',
    color: [darkenedFill[0], darkenedFill[1], darkenedFill[2], 0.7] as [number, number, number, number],
    outline: {
      color: darkenedOutline,
      width: 2
    }
  };
};

