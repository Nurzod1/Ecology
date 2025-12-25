/** @jsx jsx */
import {
  React,
  jsx,
  type AllWidgetProps
} from "jimu-core";
import { IMConfig, StatisticsData, getApiBaseUrl } from "../config";
import "./styles/widget.css";

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [data, setData] = React.useState<StatisticsData>({
    detectedCount: props.config.detectedCount || 2226,
    detectedArea: props.config.detectedArea || 400.33,
    checkedCount: props.config.checkedCount || 1800,
    inProgressCount: props.config.inProgressCount || 426
  });
  const [loading, setLoading] = React.useState<boolean>(false);
  const [isVisible, setIsVisible] = React.useState<boolean>(false);
  // Normalize locale from storage format (uz-Latn, uz-Cyrl, ru) to internal format
  const normalizeLocale = (locale: string | null): "uz" | "ru" | "cyr" => {
    if (!locale) return "ru";
    if (locale === "uz-Latn") return "uz";
    if (locale === "uz-Cyrl") return "cyr";
    if (locale === "uz" || locale === "ru" || locale === "cyr") return locale;
    return "ru";
  };

  const [locale, setLocale] = React.useState<"uz" | "ru" | "cyr">(() => {
    try {
      const stored = localStorage.getItem("customLocal");
      return normalizeLocale(stored);
    } catch {
      return "ru";
    }
  });

  const translations: Record<"uz" | "ru" | "cyr", {
    detectedCountLabel: string;
    detectedAreaLabel: string;
    checkedCountLabel: string;
    inProgressLabel: string;
    countUnit: string;
    areaUnit: string;
    numberLocale: string;
  }> = {
    uz: {
      detectedCountLabel: "Aniqlangan obyektlar soni",
      detectedAreaLabel: "Aniqlangan obyektlar maydoni",
      checkedCountLabel: "Tekshirilgan obyektlar soni",
      inProgressLabel: "Jarayonda",
      countUnit: "ta",
      areaUnit: "ga",
      numberLocale: "uz-UZ"
    },
    cyr: {
      detectedCountLabel: "Аниқланган объектлар сони",
      detectedAreaLabel: "Аниқланган объектлар майдони",
      checkedCountLabel: "Текширилган объектлар сони",
      inProgressLabel: "Жараёнда",
      countUnit: "та",
      areaUnit: "га",
      numberLocale: "uz-Cyrl-UZ"
    },
    ru: {
      detectedCountLabel: "Количество выявленных объектов",
      detectedAreaLabel: "Площадь выявленных объектов",
      checkedCountLabel: "Количество проверенных объектов",
      inProgressLabel: "В процессе",
      countUnit: "шт",
      areaUnit: "га",
      numberLocale: "ru-RU"
    }
  };

  // Listen for locale changes in localStorage
  React.useEffect(() => {
    const checkLocale = () => {
      try {
        const stored = localStorage.getItem("customLocal");
        const newLocale = normalizeLocale(stored);
        setLocale(prevLocale => {
          if (newLocale !== prevLocale) {
            return newLocale;
          }
          return prevLocale;
        });
      } catch (err) {
        // Ignore locale lookup errors
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

  // Trigger entrance animation on mount
  React.useEffect(() => {
    setIsVisible(true);
  }, []);

  // Get token from localStorage or config
  const getToken = () => {
    try {
      const tokenFromStorage = localStorage.getItem('authToken') || localStorage.getItem('token');
      return tokenFromStorage || props.config.apiToken;
    } catch (e) {
      return props.config.apiToken;
    }
  };

  // Fetch data from API
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const apiBaseUrl = props.config.apiBaseUrl || 'http://10.0.71.2:8000';
        
        // Get filters from localStorage
        const selectedYear = localStorage.getItem('selectedYear');
        const selectedSoato = localStorage.getItem('selectedSoato');
        const selectedDistrict = localStorage.getItem('selectedDistrict');
        
        // Build URL with query parameters
        const url = new URL(`${apiBaseUrl}/api/ecology/stats/summary`);
        
        // Add year filter if exists
        if (selectedYear) {
          url.searchParams.append('year', selectedYear);
        }
        
        // Determine if selectedSoato is region or district
        // District codes are typically 7 digits (e.g., 1727220)
        // Region codes are typically 4 digits (e.g., 1727)
        if (selectedSoato && selectedSoato !== 'all') {
          const soatoLength = selectedSoato.length;
          // If selectedDistrict exists, or SOATO code is 7 digits or longer, it's a district
          // If SOATO code is 4 digits, it's a region
          if (selectedDistrict || soatoLength >= 7) {
            // selectedSoato is a district
            url.searchParams.append('district', selectedSoato);
          } else if (soatoLength === 4) {
            // selectedSoato is a region
            url.searchParams.append('region', selectedSoato);
          }
        }
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('Fetching statistics from:', url.toString());
        
        const response = await fetch(url.toString(), {
          headers
        });

        console.log('API Response status:', response.status);

        if (response.ok) {
          const apiData = await response.json();
          console.log('API Data received:', apiData);
          setData({
            detectedCount: apiData.total_objects || props.config.detectedCount || 2226,
            detectedArea: apiData.total_maydon || props.config.detectedArea || 400.33,
            checkedCount: apiData.checked || props.config.checkedCount || 1800,
            inProgressCount: apiData.in_progress || props.config.inProgressCount || 426
          });
        } else {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          // Fallback to config values on API error
          setData({
            detectedCount: props.config.detectedCount || 2226,
            detectedArea: props.config.detectedArea || 400.33,
            checkedCount: props.config.checkedCount || 1800,
            inProgressCount: props.config.inProgressCount || 426
          });
        }
      } catch (err) {
        console.error('Fetch error:', err);
        // Fallback to config values on error
        setData({
          detectedCount: props.config.detectedCount || 2226,
          detectedArea: props.config.detectedArea || 400.33,
          checkedCount: props.config.checkedCount || 1800,
          inProgressCount: props.config.inProgressCount || 426
        });
      } finally {
        setLoading(false);
      }
    };

    // Track previous values to avoid unnecessary API calls
    let previousYear = localStorage.getItem('selectedYear');
    let previousSoato = localStorage.getItem('selectedSoato');
    let previousDistrict = localStorage.getItem('selectedDistrict');

    loadData();

    // Listen for localStorage changes to refetch data (only works across tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedYear' || e.key === 'selectedSoato' || e.key === 'selectedDistrict') {
        const currentYear = localStorage.getItem('selectedYear');
        const currentSoato = localStorage.getItem('selectedSoato');
        const currentDistrict = localStorage.getItem('selectedDistrict');
        
        // Only refetch if values actually changed
        if (currentYear !== previousYear || currentSoato !== previousSoato || currentDistrict !== previousDistrict) {
          previousYear = currentYear;
          previousSoato = currentSoato;
          previousDistrict = currentDistrict;
          loadData();
        }
      }
    };

    // Listen for custom events from other widgets
    const handleRegionChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      const currentSoato = detail || localStorage.getItem('selectedSoato');
      if (currentSoato !== previousSoato) {
        previousSoato = currentSoato;
        loadData();
      }
    };

    const handleDistrictChange = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail;
      const currentDistrict = detail || localStorage.getItem('selectedDistrict');
      if (currentDistrict !== previousDistrict) {
        previousDistrict = currentDistrict;
        loadData();
      }
    };

    // Poll for changes in the same window (since storage events only work across tabs)
    const checkForChanges = () => {
      const currentYear = localStorage.getItem('selectedYear');
      const currentSoato = localStorage.getItem('selectedSoato');
      const currentDistrict = localStorage.getItem('selectedDistrict');
      
      if (currentYear !== previousYear || currentSoato !== previousSoato || currentDistrict !== previousDistrict) {
        previousYear = currentYear;
        previousSoato = currentSoato;
        previousDistrict = currentDistrict;
        loadData();
      }
    };

    const intervalId = setInterval(checkForChanges, 100);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('custom-map-region-change', handleRegionChange);
    window.addEventListener('custom-map-district-change', handleDistrictChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('custom-map-region-change', handleRegionChange);
      window.removeEventListener('custom-map-district-change', handleDistrictChange);
      clearInterval(intervalId);
    };
  }, [props.config.apiBaseUrl, props.config.apiToken, props.config.detectedCount, props.config.detectedArea, props.config.checkedCount, props.config.inProgressCount]);

  // Format number with space separator
  const currentLocale = translations[locale] || translations.uz;

  const formatNumber = (num: number): string => {
    return num.toLocaleString(currentLocale.numberLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).replace(/,/g, " ");
  };

  return (
    <div className={`statistics-dashboard-widget ${isVisible ? 'visible' : ''}`}>
      <div className="statistics-cards-container">
        {/* Card 1: Detected Objects Count */}
        <div className="statistics-card">
          <div className="statistics-card-left">
            <div className="statistics-card-value-row">
              <span className="statistics-card-value">
                {loading ? '...' : formatNumber(data.detectedCount)}
              </span>
              <span className="statistics-card-unit">{currentLocale.countUnit}</span>
            </div>
            <div className="statistics-card-label">
              {currentLocale.detectedCountLabel}
            </div>
          </div>
          <div className="statistics-card-icon">
            <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.1709 23.6111C10.1709 22.9121 10.1693 22.4605 10.1383 22.1184C10.1087 21.7914 10.0591 21.6726 10.0248 21.6132C9.92916 21.4476 9.79168 21.3102 9.62607 21.2145C9.56671 21.1803 9.44792 21.1307 9.12093 21.101C8.77881 21.07 8.32726 21.0684 7.62821 21.0684H4.72223C4.02318 21.0684 3.57162 21.07 3.2295 21.101C2.90251 21.1307 2.78373 21.1803 2.72436 21.2145C2.55875 21.3102 2.42127 21.4476 2.32564 21.6132C2.29137 21.6726 2.24178 21.7914 2.21213 22.1184C2.18112 22.4605 2.17949 22.9121 2.17949 23.6111C2.17949 24.3102 2.18112 24.7617 2.21213 25.1038C2.24178 25.4308 2.29137 25.5496 2.32564 25.609C2.42127 25.7746 2.55875 25.9121 2.72436 26.0077C2.78373 26.042 2.90251 26.0916 3.2295 26.1212C3.57162 26.1522 4.02318 26.1538 4.72223 26.1538H7.62821C8.32726 26.1538 8.77881 26.1522 9.12093 26.1212C9.44792 26.0916 9.56671 26.042 9.62607 26.0077C9.79168 25.9121 9.92916 25.7746 10.0248 25.609C10.0591 25.5496 10.1087 25.4308 10.1383 25.1038C10.1693 24.7617 10.1709 24.3102 10.1709 23.6111ZM26.1538 18.09C26.1538 17.2485 26.1526 16.7044 26.1084 16.2965C26.0665 15.9094 25.9959 15.776 25.9453 15.7062C25.878 15.6137 25.7966 15.5322 25.704 15.465C25.6343 15.4144 25.5008 15.3438 25.1138 15.3018C24.7058 15.2576 24.1618 15.2564 23.3202 15.2564H20.996C20.1545 15.2564 19.6104 15.2576 19.2025 15.3018C18.8154 15.3438 18.682 15.4144 18.6122 15.465C18.5197 15.5322 18.4382 15.6137 18.371 15.7062C18.3203 15.776 18.2498 15.9094 18.2078 16.2965C18.1636 16.7044 18.1624 17.2485 18.1624 18.09V23.3202C18.1624 24.1618 18.1636 24.7058 18.2078 25.1138C18.2498 25.5008 18.3203 25.6343 18.371 25.704C18.4382 25.7966 18.5197 25.878 18.6122 25.9453C18.682 25.9959 18.8154 26.0665 19.2025 26.1084C19.6104 26.1526 20.1545 26.1538 20.996 26.1538H23.3202C24.1618 26.1538 24.7058 26.1526 25.1138 26.1084C25.5008 26.0665 25.6343 25.9959 25.704 25.9453C25.7966 25.878 25.878 25.7966 25.9453 25.704C25.9959 25.6343 26.0665 25.5008 26.1084 25.1138C26.1526 24.7058 26.1538 24.1618 26.1538 23.3202V18.09ZM10.1709 5.01311C10.1709 4.17158 10.1697 3.62749 10.1255 3.21957C10.0836 2.8325 10.013 2.69906 9.96236 2.62929C9.89514 2.53678 9.81365 2.45529 9.72114 2.38807C9.65137 2.33743 9.51793 2.26685 9.13086 2.2249C8.72295 2.1807 8.17885 2.17949 7.33732 2.17949H5.01311C4.17158 2.17949 3.62749 2.1807 3.21957 2.2249C2.8325 2.26685 2.69906 2.33743 2.62929 2.38807C2.53678 2.45529 2.45529 2.53678 2.38807 2.62929C2.33743 2.69906 2.26685 2.8325 2.2249 3.21957C2.1807 3.62749 2.17949 4.17158 2.17949 5.01311V10.2433C2.17949 11.0848 2.1807 11.6289 2.2249 12.0368C2.26685 12.4239 2.33743 12.5574 2.38807 12.6271C2.45529 12.7196 2.53678 12.8011 2.62929 12.8683C2.69906 12.919 2.8325 12.9896 3.21957 13.0315C3.62749 13.0757 4.17158 13.0769 5.01311 13.0769H7.33732C8.17885 13.0769 8.72295 13.0757 9.13086 13.0315C9.51793 12.9896 9.65137 12.919 9.72114 12.8683C9.81365 12.8011 9.89514 12.7196 9.96236 12.6271C10.013 12.5574 10.0836 12.4239 10.1255 12.0368C10.1697 11.6289 10.1709 11.0848 10.1709 10.2433V5.01311ZM26.1538 4.72223C26.1538 4.02318 26.1522 3.57162 26.1212 3.2295C26.0916 2.90251 26.042 2.78373 26.0077 2.72436C25.9121 2.55875 25.7746 2.42127 25.609 2.32564C25.5496 2.29137 25.4308 2.24178 25.1038 2.21213C24.7617 2.18112 24.3102 2.17949 23.6111 2.17949H20.7051C20.0061 2.17949 19.5545 2.18112 19.2124 2.21213C18.8854 2.24178 18.7666 2.29137 18.7073 2.32564C18.5417 2.42127 18.4042 2.55875 18.3085 2.72436C18.2743 2.78373 18.2247 2.90251 18.195 3.2295C18.164 3.57162 18.1624 4.02318 18.1624 4.72223C18.1624 5.42127 18.164 5.87283 18.195 6.21495C18.2247 6.54194 18.2743 6.66072 18.3085 6.72009C18.4042 6.8857 18.5417 7.02318 18.7073 7.11881C18.7666 7.15308 18.8854 7.20267 19.2124 7.23232C19.5545 7.26333 20.0061 7.26496 20.7051 7.26496H23.6111C24.3102 7.26496 24.7617 7.26333 25.1038 7.23232C25.4308 7.20267 25.5496 7.15308 25.609 7.11881C25.7746 7.02318 25.9121 6.8857 26.0077 6.72009C26.042 6.66072 26.0916 6.54194 26.1212 6.21495C26.1522 5.87283 26.1538 5.42127 26.1538 4.72223ZM12.3504 23.6111C12.3504 24.27 12.3513 24.8377 12.3093 25.3011C12.2659 25.7791 12.1696 26.2525 11.912 26.6987C11.6251 27.1955 11.2126 27.608 10.7158 27.8949C10.2696 28.1525 9.79624 28.2488 9.31816 28.2922C8.85484 28.3342 8.28715 28.3333 7.62821 28.3333H4.72223C4.06329 28.3333 3.49559 28.3342 3.03227 28.2922C2.55419 28.2488 2.0808 28.1525 1.63462 27.8949C1.13779 27.608 0.725348 27.1955 0.438456 26.6987C0.180856 26.2525 0.0845314 25.7791 0.0411536 25.3011C-0.00083835 24.8377 4.44253e-06 24.27 4.44253e-06 23.6111C4.44253e-06 22.9522 -0.00083835 22.3845 0.0411536 21.9212C0.0845314 21.4431 0.180856 20.9697 0.438456 20.5235C0.725348 20.0267 1.13779 19.6142 1.63462 19.3273C2.0808 19.0697 2.55419 18.9734 3.03227 18.93C3.49559 18.888 4.06329 18.8889 4.72223 18.8889H7.62821C8.28715 18.8889 8.85484 18.888 9.31816 18.93C9.79624 18.9734 10.2696 19.0697 10.7158 19.3273C11.2126 19.6142 11.6251 20.0267 11.912 20.5235C12.1696 20.9697 12.2659 21.4431 12.3093 21.9212C12.3513 22.3845 12.3504 22.9522 12.3504 23.6111ZM28.3333 23.3202C28.3333 24.113 28.335 24.7954 28.2752 25.3479C28.2131 25.9207 28.0744 26.4822 27.709 26.9853C27.5074 27.2629 27.2629 27.5074 26.9853 27.709C26.4822 28.0744 25.9207 28.2131 25.3479 28.2752C24.7954 28.335 24.113 28.3333 23.3202 28.3333H20.996C20.2032 28.3333 19.5208 28.335 18.9683 28.2752C18.3955 28.2131 17.834 28.0744 17.3309 27.709C17.0534 27.5074 16.8089 27.2629 16.6072 26.9853C16.2418 26.4822 16.1031 25.9207 16.0411 25.3479C15.9813 24.7954 15.9829 24.113 15.9829 23.3202V18.09C15.9829 17.2973 15.9813 16.6149 16.0411 16.0624C16.1031 15.4895 16.2418 14.928 16.6072 14.4249C16.8089 14.1474 17.0534 13.9029 17.3309 13.7013C17.834 13.3358 18.3955 13.1972 18.9683 13.1351C19.5208 13.0753 20.2032 13.0769 20.996 13.0769H23.3202C24.113 13.0769 24.7954 13.0753 25.3479 13.1351C25.9207 13.1972 26.4822 13.3358 26.9853 13.7013C27.2629 13.9029 27.5074 14.1474 27.709 14.4249C28.0744 14.928 28.2131 15.4895 28.2752 16.0624C28.335 16.6149 28.3333 17.2973 28.3333 18.09V23.3202ZM12.3504 10.2433C12.3504 11.0361 12.3521 11.7185 12.2923 12.271C12.2302 12.8438 12.0915 13.4053 11.7261 13.9084C11.5245 14.186 11.28 14.4304 11.0024 14.6321C10.4993 14.9975 9.93785 15.1362 9.36499 15.1982C8.8125 15.2581 8.13009 15.2564 7.33732 15.2564H5.01311C4.22034 15.2564 3.53793 15.2581 2.98545 15.1982C2.41259 15.1362 1.85111 14.9975 1.34799 14.6321C1.07045 14.4304 0.825981 14.186 0.624337 13.9084C0.258891 13.4053 0.120246 12.8438 0.0581808 12.271C-0.00163695 11.7185 4.44253e-06 11.0361 4.44253e-06 10.2433V5.01311C4.44253e-06 4.22034 -0.00163684 3.53793 0.0581808 2.98545C0.120246 2.41259 0.258891 1.85111 0.624337 1.34799C0.825981 1.07045 1.07045 0.825981 1.34799 0.624337C1.85111 0.258891 2.41259 0.120246 2.98545 0.0581808C3.53793 -0.00163684 4.22034 4.4417e-06 5.01311 4.4417e-06H7.33732C8.13009 4.4417e-06 8.8125 -0.00163683 9.36499 0.0581808C9.93785 0.120246 10.4993 0.258891 11.0024 0.624337C11.28 0.825981 11.5245 1.07045 11.7261 1.34799C12.0915 1.85111 12.2302 2.41259 12.2923 2.98545C12.3521 3.53793 12.3504 4.22034 12.3504 5.01311V10.2433ZM28.3333 4.72223C28.3333 5.38116 28.3342 5.94886 28.2922 6.41218C28.2488 6.89026 28.1525 7.36365 27.8949 7.80983C27.608 8.30666 27.1955 8.7191 26.6987 9.00599C26.2525 9.26359 25.7791 9.35992 25.3011 9.4033C24.8377 9.44529 24.27 9.44445 23.6111 9.44445H20.7051C20.0462 9.44445 19.4785 9.44529 19.0152 9.4033C18.5371 9.35992 18.0637 9.26359 17.6175 9.00599C17.1207 8.7191 16.7082 8.30666 16.4214 7.80983C16.1638 7.36365 16.0674 6.89026 16.0241 6.41218C15.9821 5.94886 15.9829 5.38116 15.9829 4.72223C15.9829 4.06329 15.9821 3.49559 16.0241 3.03227C16.0674 2.55419 16.1638 2.0808 16.4214 1.63462C16.7082 1.13779 17.1207 0.725348 17.6175 0.438456C18.0637 0.180856 18.5371 0.0845314 19.0152 0.0411536C19.4785 -0.000838347 20.0462 4.44161e-06 20.7051 4.4417e-06H23.6111C24.27 4.44161e-06 24.8377 -0.000838347 25.3011 0.0411536C25.7791 0.0845314 26.2525 0.180856 26.6987 0.438456C27.1955 0.725348 27.608 1.13779 27.8949 1.63462C28.1525 2.0808 28.2488 2.55419 28.2922 3.03227C28.3342 3.49559 28.3333 4.06329 28.3333 4.72223Z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Card 2: Detected Objects Area */}
        <div className="statistics-card">
          <div className="statistics-card-left">
            <div className="statistics-card-value-row">
              <span className="statistics-card-value">
                {loading ? '...' : formatNumber(data.detectedArea)}
              </span>
              <span className="statistics-card-unit">{currentLocale.areaUnit}</span>
            </div>
            <div className="statistics-card-label">
              {currentLocale.detectedAreaLabel}
            </div>
          </div>
          <div className="statistics-card-icon">
            <svg width="34" height="27" viewBox="0 0 34 27" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.610991 21.0742H33.393C33.4917 21.0742 33.5889 21.0394 33.6763 20.973C33.7636 20.9065 33.8383 20.8104 33.8941 20.6929C33.9498 20.5754 33.9848 20.4401 33.996 20.2987C34.0073 20.1573 33.9945 20.0141 33.9586 19.8815L32.8474 15.768C32.7867 15.5565 32.6709 15.3876 32.5248 15.2977C32.3787 15.2077 32.214 15.2039 32.066 15.287C31.918 15.3701 31.7984 15.5335 31.733 15.7421C31.6676 15.9508 31.6615 16.1881 31.7161 16.4031L32.5047 19.3239H22.9731L22.2635 9.87901H29.9598L30.7751 12.9019C30.835 13.1149 30.9507 13.2853 31.0971 13.3763C31.2436 13.4673 31.4089 13.4716 31.5575 13.3883C31.7061 13.305 31.826 13.1407 31.8913 12.9311C31.9566 12.7214 31.962 12.4831 31.9064 12.2677L28.7489 0.558089C28.7046 0.393764 28.6269 0.25256 28.526 0.152977C28.425 0.0533944 28.3056 7.36396e-05 28.1833 0H17.5214C17.3618 0.00325804 17.2096 0.096901 17.0976 0.260678C16.9855 0.424455 16.9228 0.645204 16.9228 0.875193C16.9228 1.10518 16.9856 1.32593 17.0976 1.4897C17.2096 1.65347 17.3619 1.7471 17.5214 1.75034H20.4313L20.9105 8.12866H13.0875L13.5667 1.75034H15.0927C15.2521 1.74693 15.4043 1.65323 15.5162 1.48947C15.6282 1.32572 15.6909 1.10506 15.6909 0.875171C15.6909 0.645284 15.6282 0.424627 15.5162 0.260871C15.4043 0.0971158 15.2521 0.00340949 15.0927 0H5.81474C5.69242 7.36396e-05 5.57297 0.0533944 5.47203 0.152977C5.3711 0.25256 5.29338 0.393764 5.24906 0.558089C3.99817 5.19974 1.31223 15.1786 0.0447193 19.8828C0.0101957 20.0155 -0.00163959 20.1582 0.0102157 20.2988C0.0220711 20.4395 0.0572679 20.5739 0.112825 20.6908C0.168383 20.8077 0.242665 20.9036 0.329382 20.9703C0.416098 21.0371 0.512694 21.0727 0.610991 21.0742ZM21.6527 1.75034H27.7676L29.4878 8.12866H22.132L21.6527 1.75034ZM21.0421 9.87901L21.7517 19.3239H12.2463L12.956 9.87901H21.0421ZM6.23042 1.75034H12.3453L11.866 8.12866H4.51258L6.23042 1.75034ZM4.04118 9.87901H11.7346L11.0249 19.3239H1.49745L4.04118 9.87901Z" fill="white"/>
              <path d="M33.1107 22.5857C33.05 22.374 32.9342 22.2051 32.7881 22.1151C32.642 22.0252 32.4773 22.0213 32.3292 22.1044C32.1812 22.1875 32.0616 22.3509 31.9962 22.5596C31.9308 22.7683 31.9248 23.0057 31.9794 23.2207L32.5047 25.1663H1.4933L2.01866 23.2207C2.07427 23.0053 2.06887 22.767 2.00362 22.5573C1.93838 22.3477 1.81853 22.1834 1.66996 22.1C1.52139 22.0166 1.35602 22.0208 1.20958 22.1117C1.06314 22.2026 0.947375 22.3728 0.887295 22.5857L0.0393821 25.724C0.00465145 25.8566 -0.00736392 25.9994 0.00435538 26.1402C0.0160747 26.281 0.0511829 26.4156 0.106701 26.5327C0.162219 26.6497 0.236508 26.7458 0.323266 26.8126C0.410023 26.8795 0.506688 26.9151 0.605058 26.9167H33.393C33.4917 26.9166 33.5889 26.8819 33.6763 26.8155C33.7636 26.749 33.8383 26.6529 33.8941 26.5354C33.9498 26.4179 33.9848 26.2826 33.996 26.1412C34.0073 25.9998 33.9945 25.8566 33.9586 25.724L33.1107 22.5857Z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Card 3: Checked Objects Count */}
        <div className="statistics-card">
          <div className="statistics-card-left">
            <div className="statistics-card-value-row">
              <span className="statistics-card-value">
                {loading ? '...' : formatNumber(data.checkedCount)}
              </span>
              <span className="statistics-card-unit">{currentLocale.countUnit}</span>
            </div>
            <div className="statistics-card-label">
              {currentLocale.checkedCountLabel}
            </div>
          </div>
          <div className="statistics-card-icon">
            <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.358 1.65357C12.4188 -0.551095 15.915 -0.551285 17.9757 1.65357C18.5805 2.3007 19.4355 2.65553 20.3208 2.62569C23.337 2.52376 25.8096 4.99536 25.708 8.01146C25.678 8.89685 26.0329 9.75306 26.6801 10.358C28.8843 12.4187 28.8845 15.9151 26.6801 17.9757C26.0329 18.5805 25.6781 19.4355 25.708 20.3208C25.8099 23.3371 23.3371 25.8099 20.3208 25.708C19.4355 25.6781 18.5805 26.0329 17.9757 26.6801C15.9151 28.8845 12.4187 28.8843 10.358 26.6801C9.75306 26.0329 8.89684 25.678 8.01146 25.708C4.99536 25.8096 2.52376 23.337 2.62569 20.3208C2.65553 19.4355 2.3007 18.5805 1.65357 17.9757C-0.551285 15.915 -0.551095 12.4188 1.65357 10.358C2.30079 9.75306 2.65561 8.89684 2.62569 8.01146C2.52405 4.99552 4.99552 2.52405 8.01146 2.62569C8.89684 2.65561 9.75306 2.30079 10.358 1.65357ZM16.4086 3.11873C15.1958 1.82108 13.1379 1.82109 11.9251 3.11873C10.8973 4.21847 9.44325 4.82051 7.93883 4.76966C6.16419 4.71007 4.71007 6.16419 4.76966 7.93883C4.82051 9.44325 4.21847 10.8973 3.11873 11.9251C1.82109 13.1379 1.82108 15.1958 3.11873 16.4086C4.21826 17.4364 4.82048 18.8892 4.76966 20.3934C4.70968 22.1684 6.16397 23.6236 7.93883 23.564C9.44325 23.5132 10.8973 24.1152 11.9251 25.2149C13.1379 26.5122 15.1959 26.5124 16.4086 25.2149C17.4364 24.1152 18.889 23.5132 20.3934 23.564C22.1686 23.624 23.624 22.1686 23.564 20.3934C23.5132 18.889 24.1152 17.4364 25.2149 16.4086C26.5124 15.1959 26.5122 13.1379 25.2149 11.9251C24.1152 10.8973 23.5132 9.44325 23.564 7.93883C23.6236 6.16397 22.1684 4.70968 20.3934 4.76966C18.8892 4.82048 17.4364 4.21826 16.4086 3.11873Z" fill="white"/>
              <path d="M18.4059 9.84117C18.8205 9.41806 19.501 9.41117 19.9241 9.82581C20.3472 10.2405 20.3541 10.9209 19.9395 11.344L13.9238 17.4813C13.7365 17.6724 13.5335 17.8818 13.3428 18.0372C13.1374 18.2045 12.8395 18.401 12.4349 18.4534C12.2374 18.4789 12.0363 18.4716 11.8413 18.431C11.4415 18.3479 11.159 18.129 10.9669 17.9464C10.7887 17.7768 10.6027 17.5521 10.4306 17.3472L8.33969 14.8582C7.95867 14.4046 8.01742 13.728 8.47099 13.347C8.92459 12.9659 9.60119 13.0247 9.98224 13.4782L12.0731 15.9672C12.1302 16.0352 12.181 16.0939 12.2254 16.146C12.2737 16.0973 12.3293 16.0433 12.3916 15.9798L18.4059 9.84117Z" fill="white"/>
            </svg>
          </div>
        </div>

        {/* Card 4: In Progress */}
        <div className="statistics-card">
          <div className="statistics-card-left">
            <div className="statistics-card-value-row">
              <span className="statistics-card-value">
                {loading ? '...' : formatNumber(data.inProgressCount)}
              </span>
              <span className="statistics-card-unit">{currentLocale.countUnit}</span>
            </div>
            <div className="statistics-card-label">
              {currentLocale.inProgressLabel}
            </div>
          </div>
          <div className="statistics-card-icon">
            <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26.1538 14.1667C26.1538 7.54633 20.787 2.17949 14.1667 2.17949C13.5648 2.17949 13.0769 1.69159 13.0769 1.08974C13.0769 0.487895 13.5648 -5.64195e-10 14.1667 0C21.9907 3.41999e-07 28.3333 6.34263 28.3333 14.1667C28.3333 18.6623 26.2386 22.667 22.9754 25.2613H25.5465C26.1484 25.2613 26.6363 25.7492 26.6363 26.3511C26.6361 26.9528 26.1483 27.4408 25.5465 27.4408H20.41C19.8082 27.4408 19.3204 26.9528 19.3202 26.3511V21.2131C19.3206 20.6115 19.8083 20.1234 20.41 20.1234C21.0114 20.1237 21.4994 20.6117 21.4997 21.2131V23.6494C24.3323 21.4558 26.1538 18.0236 26.1538 14.1667ZM6.8336 7.12023V4.68249C4.00066 6.87609 2.17949 10.3095 2.17949 14.1667C2.17949 20.787 7.54633 26.1538 14.1667 26.1538C14.7685 26.1538 15.2564 26.6417 15.2564 27.2436C15.2564 27.8454 14.7685 28.3333 14.1667 28.3333C6.34263 28.3333 -3.16256e-07 21.9907 0 14.1667C1.96509e-07 9.67108 2.09474 5.66631 5.35791 3.072H2.78679C2.18494 3.072 1.69705 2.5841 1.69705 1.98225C1.69721 1.38054 2.18504 0.892511 2.78679 0.892511H7.92334C8.21216 0.892511 8.4895 1.00767 8.69383 1.21177C8.89812 1.41607 9.01301 1.69335 9.01309 1.98225V7.12023C9.01278 7.72181 8.525 8.20997 7.92334 8.20997C7.32194 8.20967 6.83391 7.72163 6.8336 7.12023Z" fill="white"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Widget;