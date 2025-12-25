/** @jsx jsx */
import {
  React,
  jsx,
  type AllWidgetProps,
} from "jimu-core";
import { useState, useEffect } from "react";
import { IMConfig } from "../config";
import { translations } from "./translations";
import YearFilter from "./components/YearFilter";
import RegionCard from "./components/RegionCard";
import regionsData from "./regions.json";
import districtsData from "./districts.json";
import mahallasData from "./mahallas.json";
import "./style.scss";

// Структура данных из API
interface ApiMahalla {
  mahalla_id: number;
  quantity: number;
}

interface ApiDistrict {
  district: string;
  quantity: number;
  mahallas: ApiMahalla[];
}

interface ApiRegion {
  region: number;
  quantity: number;
  districts: ApiDistrict[];
}

interface ApiData {
  year: number;
  quantity: number;
  regions: ApiRegion[];
}

// Иерархическая структура данных: области с вложенными районами и махаллями
interface Mahalla {
  name: string;
  code: string; // Код для поиска
  value: number;
}

interface District {
  name: string;
  code: string; // Код для поиска
  value: number;
  mahallas?: Mahalla[];
}

interface RegionWithDistricts {
  name: string;
  code: string; // Код для поиска
  value: number;
  districts?: District[];
}

// Типы для JSON данных
type RegionsJson = {
  [key: string]: {
    ru?: string;
    "uz-Cyrl"?: string;
    uz?: string;
    en?: string;
    qqr?: string;
  };
};

type DistrictsJson = {
  [key: string]: {
    ru?: string;
    "uz-Cyrl"?: string;
    uz?: string;
    en?: string;
    qqr?: string;
  };
};

type MahallasJson = {
  [key: string]: {
    uz?: string;
  };
};

// Функция для нормализации имен - удаление пробелов между буквами и символами
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

// Функции для получения названий по кодам
const getRegionName = (code: string | number, locale: string): string => {
  const codeStr = String(code);
  const region = (regionsData as RegionsJson)[codeStr];
  if (!region) return codeStr;
  
  // Нормализуем локаль для поиска
  const normalizedLocale = locale === "uzcryl" ? "uz-Cyrl" : locale;
  
  const name = region[normalizedLocale as keyof typeof region] || 
         region.ru || 
         region.uz || 
         region.en || 
         region.qqr || 
         codeStr;
  
  return normalizeName(name);
};

const getDistrictName = (code: string, locale: string): string => {
  const district = (districtsData as DistrictsJson)[code];
  if (!district) return code;
  
  // Нормализуем локаль для поиска
  const normalizedLocale = locale === "uzcryl" ? "uz-Cyrl" : locale;
  
  const name = district[normalizedLocale as keyof typeof district] || 
         district.ru || 
         district.uz || 
         district.en || 
         district.qqr || 
         code;
  
  return normalizeName(name);
};

const getMahallaName = (code: string | number, locale: string): string => {
  const codeStr = String(code);
  const mahalla = (mahallasData as MahallasJson)[codeStr];
  if (!mahalla) return codeStr;
  
  // Для махаллей доступен только uz, используем его как fallback
  const name = mahalla.uz || codeStr;
  return normalizeName(name);
};

// Функция для получения данных из API
const fetchEcologyData = async (): Promise<ApiData[]> => {
  try {
    const response = await fetch("http://10.0.71.2:8000/api/ecology");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiData[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching ecology data:", error);
    return [];
  }
};

const getRegionsDataByYear = async (year: number, locale: string): Promise<RegionWithDistricts[]> => {
  const apiData = await fetchEcologyData();
  
  // Фильтруем данные по году
  const yearData = apiData.find((item) => item.year === year);
  
  if (yearData) {
    // Преобразуем данные для конкретного года, заменяя коды на названия
    return yearData.regions.map((region) => {
      const regionCode = String(region.region);
      return {
        name: getRegionName(regionCode, locale),
        code: regionCode,
        value: region.quantity,
        districts: region.districts.map((district) => {
          const districtCode = district.district;
          return {
            name: getDistrictName(districtCode, locale),
            code: districtCode,
            value: district.quantity,
            mahallas: district.mahallas.map((mahalla) => {
              const mahallaCode = String(mahalla.mahalla_id);
              return {
                name: getMahallaName(mahallaCode, locale),
                code: mahallaCode,
                value: mahalla.quantity,
              };
            }),
          };
        }),
      };
    });
  }

  return [];
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

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const savedLocaleRaw =
    (typeof window !== "undefined" && localStorage.getItem("customLocal")) ||
    "ru";
  const savedLocale = normalizeLocaleFromStorage(savedLocaleRaw);
  const [locale, setLocale] = useState<string>(savedLocale);
  // Загружаем сохраненный год из localStorage при инициализации
  const savedYear = typeof window !== "undefined" ? localStorage.getItem("selectedYear") : null;
  const initialYear = savedYear ? parseInt(savedYear, 10) : null;
  const [selectedYear, setSelectedYear] = useState<number | null>(initialYear);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [regionsData, setRegionsData] = useState<RegionWithDistricts[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("desc");
  const t = translations[locale] || translations.ru;

  // Функция для изменения года с сохранением в localStorage
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedYear", String(year));
      // Очищаем переменную selectedSoato при изменении года
      localStorage.removeItem("selectedSoato");
    }
  };

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

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const apiData = await fetchEcologyData();
        
        // Извлекаем доступные годы из API данных
        const years = apiData.map(item => item.year).sort((a, b) => b - a); // Сортируем по убыванию (новые первыми)
        setAvailableYears(years);
        
        // Устанавливаем год: сначала проверяем сохраненный, затем первый доступный
        if (years.length > 0) {
          const savedYearValue = typeof window !== "undefined" ? localStorage.getItem("selectedYear") : null;
          const yearToSet = savedYearValue && years.includes(parseInt(savedYearValue, 10))
            ? parseInt(savedYearValue, 10)
            : years[0];
          
          if (selectedYear === null || selectedYear !== yearToSet) {
            setSelectedYear(yearToSet);
            if (typeof window !== "undefined") {
              localStorage.setItem("selectedYear", String(yearToSet));
            }
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        setAvailableYears([]);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Загрузка данных при изменении года или локали
  useEffect(() => {
    if (selectedYear === null) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getRegionsDataByYear(selectedYear, locale);
        setRegionsData(data);
      } catch (error) {
        console.error("Error loading data:", error);
        setRegionsData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setSelectedRegion(null);
    setSelectedDistrict(null);
  }, [selectedYear, locale]);

  // Получаем данные для отображения: области или районы
  const getDisplayData = (): Array<{ name: string; value: number; code: string }> => {
    if (selectedRegion) {
      // Показываем районы выбранной области
      const region = regionsData.find(r => r.code === selectedRegion);
      return region?.districts?.map(d => ({ name: d.name, value: d.value, code: d.code })) || [];
    }
    // Показываем области
    return regionsData.map(r => ({ name: r.name, value: r.value, code: r.code }));
  };

  const handleRegionClick = (regionName: string, code?: string) => {
    // Ищем регион по названию, но сохраняем код
    const region = regionsData.find(r => r.name === regionName);
    if (region) {
      const regionCode = code || region.code;
      
      // Сохраняем код области в localStorage
      if (typeof window !== "undefined" && regionCode) {
        localStorage.setItem("selectedSoato", regionCode);
      }
      
      if (region.districts && region.districts.length > 0) {
        // Устанавливаем выбранную область и показываем список районов
        // НЕ выбираем район автоматически - только показываем список
        setSelectedRegion(regionCode);
        setSelectedDistrict(null); // Убеждаемся, что район не выбран
        setSortOrder("desc"); // Сбрасываем сортировку на значение по умолчанию
      }
    }
  };

  const handleDistrictClick = (districtName: string, code?: string) => {
    // Ищем район по названию, но используем код для поиска
    // Этот обработчик вызывается только когда мы уже в списке районов (selectedRegion !== null)
    const region = regionsData.find(r => r.code === selectedRegion);
    const district = region?.districts?.find(d => d.name === districtName);
    
    if (district && selectedRegion) {
      // Это клик на район - сохраняем код района
      const districtCode = code || district.code;
      setSortOrder("desc"); // Сбрасываем сортировку на значение по умолчанию
      
      // Сохраняем код района в localStorage
      if (typeof window !== "undefined" && districtCode) {
        localStorage.setItem("selectedSoato", districtCode);
      }
      
      // НЕ устанавливаем selectedDistrict - мы остаемся в списке районов
    }
  };

  const handleBackClick = () => {
    if (selectedRegion) {
      // Возврат к областям - очищаем переменную в localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedSoato");
      }
      
      setSelectedRegion(null);
      setSelectedDistrict(null);
      setSortOrder("desc"); // Сбрасываем сортировку на значение по умолчанию
    }
  };

  const displayData = getDisplayData();
  
  // Применяем сортировку к данным
  const sortedDisplayData = sortOrder
    ? [...displayData].sort((a, b) => {
        if (sortOrder === "asc") {
          return a.value - b.value;
        } else {
          return b.value - a.value;
        }
      })
    : displayData;
  
  // Получаем названия для заголовков
  const selectedRegionName = selectedRegion 
    ? regionsData.find(r => r.code === selectedRegion)?.name || selectedRegion
    : null;
  
  const currentTitle = selectedRegionName
    ? (t.districtsTitle || "{name}").replace("{name}", selectedRegionName)
    : t.statisticsByRegion || "Viloyat kesimida statistika";

  return (
    <div className="region-statistics-widget">
      <YearFilter
        selectedYear={selectedYear || availableYears[0] || 2025}
        years={availableYears}
        onYearChange={handleYearChange}
      />
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "#e8e8e8" }}>
          {t.loading || "Yuklanmoqda..."}
        </div>
      ) : displayData.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "#e8e8e8" }}>
          {t.noData || "Ma'lumotlar topilmadi"}
        </div>
      ) : (
        <RegionCard
          data={sortedDisplayData}
          selectedYear={selectedYear}
          onRegionClick={selectedRegion ? handleDistrictClick : handleRegionClick}
          selectedRegion={selectedRegion}
          selectedDistrict={null}
          onBackClick={selectedRegion ? handleBackClick : undefined}
          title={currentTitle}
          backLabel={t.back}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />
      )}
    </div>
  );
};

export default Widget;

