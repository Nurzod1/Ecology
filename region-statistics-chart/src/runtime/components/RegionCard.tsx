/** @jsx jsx */
import { React, jsx } from "jimu-core";
import ReactECharts from "echarts-for-react";

interface RegionData {
  name: string;
  value: number;
  code?: string; // Код для сохранения в localStorage
}

interface RegionCardProps {
  data: RegionData[];
  selectedYear: number;
  onRegionClick?: (regionName: string, code?: string) => void;
  selectedRegion?: string | null;
  selectedDistrict?: string | null;
  onBackClick?: () => void;
  title?: string;
  backLabel?: string;
  sortOrder?: "asc" | "desc" | null;
  onSortChange?: (order: "asc" | "desc" | null) => void;
}

const RegionCard: React.FC<RegionCardProps> = ({
  data,
  selectedYear,
  onRegionClick,
  selectedRegion,
  selectedDistrict,
  onBackClick,
  title,
  backLabel,
  sortOrder = null,
  onSortChange,
}) => {
  const textColor = "#e8e8e8";
  const resolvedBackLabel = backLabel || "Orqaga";

  const dataMaxValue = Math.max(...data.map((item) => item.value), 0);
  const dataMinValue = Math.min(...data.map((item) => item.value), 0);
  const valueRange = dataMaxValue - dataMinValue || 1; // Избегаем деления на ноль

  // Мягкий градиент цветов - от чуть темнее среднего к светлому
  // Минимальные значения будут чуть темнее, но не слишком
  const lightColor = "#91dff6";   // Самый светлый (максимальное значение)
  const mediumColor = "#4eccf2";  // Средний цвет
  const darkerColor = "#2ec3ee";   // Чуть темнее для минимальных значений
  
  // Функция для преобразования HEX в RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  };

  // Функция для преобразования RGB в HEX
  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + [r, g, b].map((x) => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  // Функция для вычисления цвета на основе значения
  // Используем мягкий градиент от чуть темнее к светлому
  const getColorByValue = (value: number): string => {
    if (valueRange === 0) {
      // Если все значения одинаковые, используем средний цвет
      return mediumColor;
    }
    
    // Нормализуем значение от 0 до 1 (0 = минимальное, 1 = максимальное)
    const normalizedValue = (value - dataMinValue) / valueRange;
    
    // Используем квадратичную функцию для более плавного перехода
    const smoothValue = normalizedValue * normalizedValue;
    
    // Интерполируем между чуть темнее и светлым цветом
    const [r1, g1, b1] = hexToRgb(darkerColor);
    const [r2, g2, b2] = hexToRgb(lightColor);
    
    const r = r1 + (r2 - r1) * smoothValue;
    const g = g1 + (g2 - g1) * smoothValue;
    const b = b1 + (b2 - b1) * smoothValue;
    
    return rgbToHex(r, g, b);
  };

  // Улучшенная логика округления с учетом максимального значения
  // Цель: меньше линий сетки, правильное округление
  let step: number;
  let maxValue: number;

  if (dataMaxValue === 0) {
    step = 10;
    maxValue = 10;
  } else if (dataMaxValue <= 50) {
    // Для малых значений используем шаг 10-20
    step = dataMaxValue <= 20 ? 5 : 10;
    maxValue = Math.ceil(dataMaxValue / step) * step;
    // Округляем до ближайшего кратного step
    if (maxValue < dataMaxValue * 1.1) {
      maxValue += step;
    }
  } else if (dataMaxValue <= 100) {
    step = 20;
    maxValue = Math.ceil(dataMaxValue / step) * step;
    if (maxValue < dataMaxValue * 1.1) {
      maxValue += step;
    }
  } else if (dataMaxValue <= 200) {
    step = 50;
    maxValue = Math.ceil(dataMaxValue / step) * step;
    if (maxValue < dataMaxValue * 1.1) {
      maxValue += step;
    }
  } else if (dataMaxValue <= 500) {
    step = 100;
    maxValue = Math.ceil(dataMaxValue / step) * step;
    if (maxValue < dataMaxValue * 1.1) {
      maxValue += step;
    }
  } else if (dataMaxValue <= 1000) {
    step = 200;
    maxValue = Math.ceil(dataMaxValue / step) * step;
    if (maxValue < dataMaxValue * 1.1) {
      maxValue += step;
    }
  } else {
    // Для больших значений используем шаг 500
    step = 500;
    maxValue = Math.ceil(dataMaxValue / step) * step;
    if (maxValue < dataMaxValue * 1.1) {
      maxValue += step;
    }
  }

  // Ограничиваем видимую область до 9 элементов по умолчанию
  const maxVisibleItems = 9;
  const dataCount = data.length;
  const shouldShowScroll = dataCount > maxVisibleItems;
  
  // Фиксированные размеры для линий
  const calculatedBarHeight = 40; // Фиксированная высота баров
  const barCategoryGap = 5; // Фиксированный отступ между линиями
  
  // Высота контейнера для видимой области (9 элементов)
  const containerHeight = maxVisibleItems * (calculatedBarHeight + barCategoryGap) + 150;
  // Высота всего чарта (все элементы)
  const fullChartHeight = dataCount * (calculatedBarHeight + barCategoryGap) + 150;

  // Фиксированный размер шрифта
  const fontSize = 12;

  // Функция для удаления пробелов между буквами и символами
  const normalizeName = (name: string): string => {
    if (!name) return name;
    
    let normalized = name;
    
    // Многократная обработка для гарантированного удаления всех пробелов
    // Повторяем несколько раз, так как могут быть вложенные пробелы
    for (let i = 0; i < 5; i++) {
      // Удаляем пробелы между буквой "o" (в любом регистре) и апострофом - приоритетная обработка
      normalized = normalized.replace(/([oO])\s+([''ʻʼʽ`])/gi, "$1$2");
      normalized = normalized.replace(/([''ʻʼʽ`])\s+([oO])/gi, "$1$2");
      
      // Удаляем пробелы между любой буквой/цифрой и апострофом
      normalized = normalized.replace(/([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])\s+([''ʻʼʽ`])/gi, "$1$2");
      normalized = normalized.replace(/([''ʻʼʽ`])\s+([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])/gi, "$1$2");
      
      // Удаляем пробелы между буквой/цифрой и любым символом (не буквой, не цифрой, не пробелом)
      normalized = normalized.replace(/([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])\s+([^\s\w])/g, "$1$2");
      
      // Удаляем пробелы между символом (не буквой, не цифрой) и буквой/цифрой
      normalized = normalized.replace(/([^\s\w])\s+([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])/g, "$1$2");
      
      // Обрабатываем неразрывные пробелы и другие Unicode пробелы
      normalized = normalized.replace(/([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])[\u00A0\u2000-\u200B\u202F\u205F\u3000]+([''ʻʼʽ`])/gi, "$1$2");
      normalized = normalized.replace(/([''ʻʼʽ`])[\u00A0\u2000-\u200B\u202F\u205F\u3000]+([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])/gi, "$1$2");
      normalized = normalized.replace(/([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])[\u00A0\u2000-\u200B\u202F\u205F\u3000]+([^\s\w])/g, "$1$2");
      normalized = normalized.replace(/([^\s\w])[\u00A0\u2000-\u200B\u202F\u205F\u3000]+([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])/g, "$1$2");
    }
    
    return normalized;
  };

  const chartData = data.map((item) => ({
    name: normalizeName(item.name),
    value: item.value,
    itemStyle: {
      color: getColorByValue(item.value), // Цвет зависит от значения (мягкий градиент)
    },
  }));

  const categories = data.map((item) => normalizeName(item.name));

  const handleBarClick = (params: any) => {
    const normalizedName = params?.name;
    if (!normalizedName) return;

    // Находим код выбранного элемента, сравнивая нормализованные имена
    const selectedItem = data.find(item => normalizeName(item.name) === normalizedName);
    const code = selectedItem?.code;
    const originalName = selectedItem?.name || normalizedName;

    onRegionClick?.(originalName, code);

    window.dispatchEvent(
      new CustomEvent("region-statistics-region-clicked", {
        detail: { regionName: originalName, code },
      })
    );
  };

  const option = {
    backgroundColor: "transparent",
    animationDuration: 800,
    animationEasing: "cubicOut",

    grid: {
      left: 150, // Увеличено для полного отображения названий
      right: 20,
      top: 10,
      bottom: 40, // место для нижних подписей оси X
      containLabel: false,
      // Для большого количества элементов увеличиваем верхний и нижний отступы
      ...(dataCount > 20 && {
        top: 15,
        bottom: 50,
      }),
    },

    xAxis: {
      type: "value",
      min: 0,
      max: maxValue,
      boundaryGap: [0, 0],
      position: "bottom",
      axisLine: {
        show: false,
      },
      axisTick: { show: false },

      axisLabel: {
        show: false, // Скрываем значения на оси X
      },

      splitLine: {
        show: false, // Убираем линии сетки
      },

      // Контролируем количество линий сетки через splitNumber
      // Ограничиваем максимум 10 линиями для лучшей читаемости
      splitNumber: Math.min(Math.ceil(maxValue / step), 10),
      interval: step,
    },

    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: fontSize,
        margin: 10,
        width: 140, // Увеличено для полного отображения названий
        overflow: "none", // Показываем названия полностью, не обрезаем
        formatter: (value: string) => {
          // Явно нормализуем значение перед отображением
          // Используем неразрывное соединение для предотвращения разбиения текста
          const normalized = normalizeName(value);
          // Заменяем комбинации буква+апостроф на версию с неразрывным соединением
          return normalized.replace(/([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])([''ʻʼʽ`])([a-zA-Zа-яА-ЯёЁўЎқҚғҒҳҲ0-9])/g, "$1$2$3");
        },
        rich: {
          // Используем rich text для более точного контроля
          normal: {
            color: textColor,
            fontSize: fontSize,
          },
        },
      },
      // Настройки для равномерного распределения элементов
      boundaryGap: true, // Добавляем отступы сверху и снизу
      // Убеждаемся, что все элементы видны и равномерно распределены
      splitLine: {
        show: false, // Убираем горизонтальные линии сетки для чистоты
      },
    },

    series: [
      {
        type: "bar",
        data: chartData,
        barWidth: calculatedBarHeight,
        barCategoryGap: barCategoryGap, // Используем вычисленное значение в пикселях
        label: {
          show: true,
          position: "right",
          color: textColor,
          fontSize: fontSize,
        },
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
        },
      },
    ],

    tooltip: {
      trigger: "axis",
      axisPointer: { 
        type: "none" // Убираем визуальное отображение указателя оси (белый фон)
      },
      formatter: (params: any) => {
        const param = params[0];
        return `${normalizeName(param.name)}: ${param.value}`;
      },
      // Прозрачный фон с блюром и скруглением
      backgroundColor: "rgba(16, 28, 50, 0.25)",
      borderColor: "rgba(255, 255, 255, 0.08)",
      extraCssText: `
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
        padding: 8px 10px;
      `,
      textStyle: { color: textColor },
    },
  };

  return (
    <div className="region-card">
      <div className="region-card__title-wrapper">
        {(selectedRegion || selectedDistrict) && onBackClick && (
          <button
            className="region-card__back-button"
            onClick={onBackClick}
            title={resolvedBackLabel}
            aria-label={resolvedBackLabel}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}

        <div className="region-card__title">
          {title ||
            (selectedRegion
              ? `${selectedRegion} tumanlari`
              : "Viloyat kesimida statistika")}
        </div>

        {onSortChange && (
          <button
            className="region-card__sort-button"
            data-active={sortOrder !== null ? "true" : "false"}
            onClick={() => {
              // Переключаем: desc -> asc -> null -> desc
              if (sortOrder === "desc") {
                onSortChange("asc");
              } else if (sortOrder === "asc") {
                onSortChange(null);
              } else {
                onSortChange("desc");
              }
            }}
            title="Сортировка"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sortOrder === "asc" ? (
                // Стрелка вверх (по возрастанию)
                <g>
                  <path d="M11 11h4" />
                  <path d="M11 15h7" />
                  <path d="M11 19h10" />
                  <path d="M9 7 6 4 3 7" />
                  <path d="M6 6v14" />
                </g>
              ) : sortOrder === "desc" ? (
                // Стрелка вниз (по убыванию)
                <g>
                  <path d="M11 11h4" />
                  <path d="M11 15h7" />
                  <path d="M11 19h10" />
                  <path d="M9 15 6 18 3 15" />
                  <path d="M6 18V4" />
                </g>
              ) : (
                // Две стрелки (без сортировки)
                <g>
                  <path d="M3 6h18" />
                  <path d="M7 12h10" />
                  <path d="M10 18h4" />
                </g>
              )}
            </svg>
          </button>
        )}
      </div>

      <div 
        className={`region-card__chart ${shouldShowScroll ? 'region-card__chart--scrollable' : ''} ${selectedDistrict ? 'region-card__chart--level-3' : ''}`}
        style={{
          overflowY: shouldShowScroll ? "auto" : "hidden",
          overflowX: "hidden",
          ...(shouldShowScroll && {
            // height: `400px`,
            // maxHeight: `400px`,
            flex: "none", // Убираем flex для правильной работы скролла
            scrollbarWidth: "thin",
            scrollbarColor: "#4eccf2 #1a1a2e",
          }),
          ...(!shouldShowScroll && {
            maxHeight: `400px`,
          }),
        }}
      >
        <ReactECharts
          key={`${selectedYear}-${selectedRegion || "root"}-${selectedDistrict || ""}`}
          option={option}
          style={{ 
            width: "100%", 
            height: shouldShowScroll ? `${fullChartHeight}px` : "100%", 
            minHeight: shouldShowScroll ? "auto" : "300px",
          }}
          notMerge={true}
          lazyUpdate={false}
          onEvents={{ click: handleBarClick }}
        />
      </div>
    </div>
  );
};

export default RegionCard;
