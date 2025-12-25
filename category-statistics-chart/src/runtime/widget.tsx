/** @jsx jsx */
import {
  React,
  jsx,
  type AllWidgetProps,
} from "jimu-core";
import { useState, useEffect } from "react";
import { IMConfig } from "../config";
import { translations } from "./translations";
import CategoryChart from "./components/CategoryChart";
import "./style.scss";

interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

interface TurStat {
  tur: number;
  quantity: number;
}

interface ApiResponse {
  total_records: number;
  limit: number;
  offset: number;
  data: any[];
  tur_stats: TurStat[];
}

// Базовое название типа для API запросов (на узбекском кириллице)
const TUR_API_NAMES: { [key: number]: string } = {
  0: "Аҳоли яшаш жойларида эҳтимоли юқори бўлган ноқонуний чиқинди полигонлари сони",
  1: "Дарё муҳофаза ҳудудидаги ноқонуний полигонлар сони",
  2: "Саноат зоналарида эҳтимоли юқори бўлган ноқонуний чиқинди полигонлари сони",
  3: "Қонуний чиқинди полигонлари чегарасидан ташқарига чиқиш ҳолати сони",
  4: "Қонуний чиқинди полигонларининг умумий сони"
};

// Переводы названий типов
const TUR_TRANSLATIONS: { [key: number]: { [locale: string]: string } } = {
  0: {
    uz: "Aholi yashash joylarida ehtimoli yuqori bo'lgan noqonuniy chiqindi poligonlari soni",
    uzcryl: "Аҳоли яшаш жойларида эҳтимоли юқори бўлган ноқонуний чиқинди полигонлари сони",
    ru: "Количество незаконных полигонов отходов с высокой вероятностью в местах проживания населения",
    en: "Number of illegal waste landfills with high probability in residential areas",
    qqr: "Тұрғындар тұратын жерлерде ықтималдығы жоғары заңсыз қалдық полигондарының саны"
  },
  1: {
    uz: "Daryo muhofaza hududidagi noqonuniy poligonlar soni",
    uzcryl: "Дарё муҳофаза ҳудудидаги ноқонуний полигонлар сони",
    ru: "Количество незаконных полигонов в водоохранной зоне",
    en: "Number of illegal landfills in water protection zone",
    qqr: "Су қорғау аймағындағы заңсыз полигондардың саны"
  },
  2: {
    uz: "Sanoat zonlarida ehtimoli yuqori bo'lgan noqonuniy chiqindi poligonlari soni",
    uzcryl: "Саноат зоналарида эҳтимоли юқори бўлган ноқонуний чиқинди полигонлари сони",
    ru: "Количество незаконных полигонов отходов с высокой вероятностью в промышленных зонах",
    en: "Number of illegal waste landfills with high probability in industrial zones",
    qqr: "Өнеркәсіптік аймақтарда ықтималдығы жоғары заңсыз қалдық полигондарының саны"
  },
  3: {
    uz: "Qonuniy chiqindi poligonlari chegarasidan tashqariga chiqish holati soni",
    uzcryl: "Қонуний чиқинди полигонлари чегарасидан ташқарига чиқиш ҳолати сони",
    ru: "Количество случаев выхода за границы законных полигонов отходов",
    en: "Number of cases of exceeding boundaries of legal waste landfills",
    qqr: "Заңды қалдық полигондарының шекарасынан тыс шығу жағдайларының саны"
  },
  4: {
    uz: "Qonuniy chiqindi poligonlarining umumiy soni",
    uzcryl: "Қонуний чиқинди полигонларининг умумий сони",
    ru: "Общее количество законных полигонов отходов",
    en: "Total number of legal waste landfills",
    qqr: "Заңды қалдық полигондарының жалпы саны"
  }
};

// Функция для получения названия типа по локали
const getTurName = (turId: number, locale: string): string => {
  const translations = TUR_TRANSLATIONS[turId];
  if (!translations) return `Тип ${turId}`;
  
  // Нормализуем локаль для поиска
  const normalizedLocale = locale === "uzcryl" ? "uzcryl" : locale;
  
  return translations[normalizedLocale] || 
         translations.ru || 
         translations.uzcryl || 
         TUR_API_NAMES[turId] || 
         `Тип ${turId}`;
};

// Функции для конвертации между localStorage форматом (uz-Cyrl, uz-Latn, ru) и внутренним форматом (uzcryl, uz, ru)
const normalizeLocaleFromStorage = (locale: string | null): string => {
  if (!locale) return "ru";
  if (locale === "uz-Cyrl") return "uzcryl";
  if (locale === "uz-Latn") return "uz";
  return locale;
};

const normalizeLocaleToStorage = (locale: string): string => {
  if (locale === "uzcryl") return "uz-Cyrl";
  if (locale === "uz") return "uz-Latn";
  return locale;
};

// Функция для запроса данных с API для каждого типа отдельно
const fetchEcologyData = async (locale: string): Promise<CategoryData[]> => {
  try {
    const allTurStats: TurStat[] = [];
    
    // Отправляем запросы для каждого типа отдельно, используя API названия
    const requests = Object.entries(TUR_API_NAMES).map(async ([turIdStr, turName]) => {
      try {
        const turId = parseInt(turIdStr, 10);
        // Кодируем название типа для URL (используем базовое название для API)
        const encodedTurName = encodeURIComponent(turName);
        const url = `http://10.0.71.2:8000/api/ecology/filter?tur=${encodedTurName}&limit=0&offset=0`;
        
        console.log(`Отправка запроса для типа: ${turName} (${turId})`);
        console.log(`URL: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for tur: ${turName}`);
        }
        
        const apiData: ApiResponse = await response.json();
        
        console.log(`Ответ для типа ${turName}:`, apiData);
        
        // Извлекаем tur_stats из ответа
        if (apiData.tur_stats && apiData.tur_stats.length > 0) {
          apiData.tur_stats.forEach((stat) => {
            allTurStats.push(stat);
          });
        }
      } catch (error) {
        console.error(`Ошибка при запросе для типа ${turName}:`, error);
        // Продолжаем обработку других типов даже при ошибке
      }
    });
    
    // Ждем завершения всех запросов
    await Promise.all(requests);
    
    // Выводим все собранные данные в консоль
    console.log("Все собранные tur_stats:", allTurStats);
    
    // Сортируем по количеству (по убыванию)
    const sortedStats = allTurStats.sort((a, b) => b.quantity - a.quantity);
    
    // Преобразуем для отображения в чарте, используя переводы
    const result: CategoryData[] = sortedStats.map(({ tur, quantity }) => ({
      name: getTurName(tur, locale),
      value: quantity,
    }));
    
    console.log("Итоговые данные для чарта:", result);
    
    return result;
  } catch (error) {
    console.error("Error fetching ecology data:", error);
    // Возвращаем пустой массив в случае ошибки
    return [];
  }
};

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const savedLocaleRaw =
    (typeof window !== "undefined" && localStorage.getItem("customLocal")) ||
    "ru";
  const savedLocale = normalizeLocaleFromStorage(savedLocaleRaw);
  const [locale, setLocale] = useState<string>(savedLocale);
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const t = translations[locale] || translations.ru;

  // Listen for locale changes in localStorage
  useEffect(() => {
    const checkLocale = () => {
      try {
        const stored = localStorage.getItem("customLocal");
        if (stored) {
          const newLocale = normalizeLocaleFromStorage(stored);
          setLocale(prevLocale => {
            if (newLocale !== prevLocale) {
              return newLocale;
            }
            return prevLocale;
          });
        }
      } catch (err) {
        // Ignore errors
      }
    };

    // Check on mount
    checkLocale();

    // Listen for storage events (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "customLocal" || e.key === null) {
        checkLocale();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll for changes in same tab
    const interval = setInterval(checkLocale, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedData = await fetchEcologyData(locale);
      setData(fetchedData);
      setLoading(false);
    };

    loadData();
  }, [locale]);

  // Обработчик клика на тип для сохранения в localStorage
  const handleTypeClick = (index: number) => {
    if (data[index] && data[index].value > 0) {
      // Находим соответствующий tur (id) для выбранного типа
      // Перебираем все переводы, чтобы найти turId по переведенному названию
      const selectedItem = data[index];
      let turId: number | null = null;
      let turName: string | null = null;
      
      // Ищем turId по переведенному названию
      for (const [idStr, translations] of Object.entries(TUR_TRANSLATIONS)) {
        const id = parseInt(idStr, 10);
        // Проверяем все переводы для этого типа
        if (Object.values(translations).includes(selectedItem.name)) {
          turId = id;
          // Используем базовое название для API (на узбекском кириллице)
          turName = TUR_API_NAMES[id];
          break;
        }
      }
      
      if (turId !== null && turName) {
        // Сохраняем в localStorage объект с id и названием (базовое название для API)
        if (typeof window !== "undefined") {
          const selectedTypeData = {
            id: turId,
            name: turName
          };
          localStorage.setItem("selectedTypeId", JSON.stringify(selectedTypeData));
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="category-statistics-widget">
        <div style={{ padding: "20px", textAlign: "center", color: "#fff" }}>
          {t.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="category-statistics-widget">
      <CategoryChart 
        data={data} 
        title={t.title}
        onTypeClick={handleTypeClick}
      />
    </div>
  );
};

export default Widget;

