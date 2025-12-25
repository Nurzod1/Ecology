/** @jsx jsx */
import {
  React,
  jsx,
  type AllWidgetProps,
  LinkType,
  jimuHistory
} from "jimu-core";
import { IMConfig, getApiBaseUrl } from "../config";
import MonitoringResultsTable from "./components/MonitoringResultsTable";
import { MonitoringResultItem } from "./types/monitoringTypes";
import { translations } from "./translations";
import "./styles/widget.css";

const SELECTED_ID_STORAGE_KEY = "selectedId";

// Normalize locale from storage format (uz-Latn, uz-Cyrl, ru) to internal format
const normalizeLocale = (locale: string | null): "uz" | "uzcryl" | "ru" => {
  if (!locale) return "ru";
  if (locale === "uz-Latn") return "uz";
  if (locale === "uz-Cyrl") return "uzcryl";
  if (locale === "uz" || locale === "uzcryl" || locale === "ru") return locale;
  return "ru";
};

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [locale, setLocale] = React.useState<"uz" | "uzcryl" | "ru">(() => {
    try {
      const stored = localStorage.getItem("customLocal");
      return normalizeLocale(stored);
    } catch {
      return "ru";
    }
  });
  const t = translations[locale] || translations.ru;
  const getSelectedIdFromStorage = () => {
    try {
      return localStorage.getItem(SELECTED_ID_STORAGE_KEY) || undefined;
    } catch {
      return undefined;
    }
  };

  const [selectedRowId, setSelectedRowId] = React.useState<string | undefined>(
    () => getSelectedIdFromStorage()
  );
  const [data, setData] = React.useState<MonitoringResultItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

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

  // Get token from localStorage or config
  const getToken = () => {
    try {
      const tokenFromStorage = localStorage.getItem('authToken') || localStorage.getItem('token');
      return tokenFromStorage || props.config.apiToken;
    } catch (e) {
      return props.config.apiToken;
    }
  };

  const [token, setToken] = React.useState<string | null>(getToken());

  // Fetch data from API
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get filters from localStorage
        const selectedYear = localStorage.getItem('selectedYear');
        const selectedSoato = localStorage.getItem('selectedSoato');
        const selectedDistrict = localStorage.getItem('selectedDistrict');
        const status = localStorage.getItem('status');
        const offset = 0;
        
        // Build API URL
        const apiBaseUrl = props.config.apiBaseUrl || 'http://10.0.71.2:8000';
        const url = new URL(`${apiBaseUrl}/api/ecology/`);
        
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
        
        // Add status filter if exists
        if (status) {
          url.searchParams.append('status', status);
        }
        
        url.searchParams.append('offset', offset.toString());

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('Fetching monitoring results from:', url.toString());

        const response = await fetch(url.toString(), {
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', response.status, errorText);
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const apiResponse = await response.json();
        console.log('API Data received:', apiResponse);

        // Transform API response to MonitoringResultItem format
        const transformedData: MonitoringResultItem[] = (apiResponse.data || []).map((item: any) => {
          // Helper function to convert 2 to false, 1 to true, null stays null
          // Handles both string "1" and number 1
          const convertToBooleanOrNull = (value: any): boolean | null => {
            if (value === null || value === undefined) {
              return null;
            }
            if (value === 2 || value === "2") {
              return false;
            }
            // Check for string "1" or number 1
            return value === 1 || value === "1";
          };

          // Helper function to convert null/2 to false, 1 to true (for other fields)
          const convertToBoolean = (value: any): boolean => {
            if (value === null || value === undefined || value === 2 || value === "2") {
              return false;
            }
            // Check for string "1" or number 1
            return value === 1 || value === "1";
          };

          // Helper function to determine ekologiya status based on value
          const getEkologiyaStatus = (value: boolean | null): 'pending' | 'warning' | 'caution' | 'completed' => {
            if (value === null) return 'pending';
            if (!value) return 'pending';
            // If value is true, determine status - default to 'completed' if we don't have more info
            // You can adjust this logic based on your business rules
            return 'completed';
          };

          // Convert fields: null stays null, 2 = false, 1 = true (for ekologiya)
          // For other fields: null/2 = false, 1 = true
          const uzspaceValue = convertToBoolean(item.uzspace);
          const tekshirishValue = convertToBooleanOrNull(item.tekshirish); // Preserve null
          const prokuraturaValue = convertToBoolean(item.prokuratura);

          return {
            id: item.globalid || `{${item.gid}}`,
            uzcosmos: {
              status: uzspaceValue ? 'completed' : 'pending',
              progress: 100 // Always 100% as per mock data pattern
            },
            ekologiya: {
              status: getEkologiyaStatus(tekshirishValue),
              value: tekshirishValue // Can be true, false, or null
            },
            prokuratura: {
              status: prokuraturaValue ? 'completed' : 'pending',
              progress: prokuraturaValue ? 100 : 0
            }
          };
        });

        setData(transformedData);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    // Track previous values to avoid unnecessary API calls
    let previousYear = localStorage.getItem('selectedYear');
    let previousSoato = localStorage.getItem('selectedSoato');
    let previousDistrict = localStorage.getItem('selectedDistrict');
    let previousStatus = localStorage.getItem('status');

    loadData();

    // Listen for localStorage changes to refetch data (only works across tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedYear' || e.key === 'selectedSoato' || e.key === 'selectedDistrict' || e.key === 'status') {
        const currentYear = localStorage.getItem('selectedYear');
        const currentSoato = localStorage.getItem('selectedSoato');
        const currentDistrict = localStorage.getItem('selectedDistrict');
        const currentStatus = localStorage.getItem('status');
        
        // Only refetch if values actually changed
        if (currentYear !== previousYear || currentSoato !== previousSoato || currentDistrict !== previousDistrict || currentStatus !== previousStatus) {
          previousYear = currentYear;
          previousSoato = currentSoato;
          previousDistrict = currentDistrict;
          previousStatus = currentStatus;
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
      const currentStatus = localStorage.getItem('status');
      
      if (currentYear !== previousYear || currentSoato !== previousSoato || currentDistrict !== previousDistrict || currentStatus !== previousStatus) {
        previousYear = currentYear;
        previousSoato = currentSoato;
        previousDistrict = currentDistrict;
        previousStatus = currentStatus;
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
  }, [token, props.config.apiBaseUrl]);

  React.useEffect(() => {
    const syncFromStorage = () => {
      const storedId = getSelectedIdFromStorage();
      // Only update if different to avoid unnecessary re-renders
      setSelectedRowId(prev => prev !== storedId ? storedId : prev);
    };

    // Sync on mount
    syncFromStorage();

    // Listen for native storage events (cross-tab)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SELECTED_ID_STORAGE_KEY) {
        setSelectedRowId(event.newValue || undefined);
      }
    };

    // Listen for custom storage events (same-tab)
    const handleCustomStorageChange = () => {
      syncFromStorage();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleCustomStorageChange);

    // Poll localStorage periodically to catch changes from same tab
    const intervalId = setInterval(syncFromStorage, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleCustomStorageChange);
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array - only run on mount/unmount

  const handleRowClick = (item: MonitoringResultItem) => {
    setSelectedRowId(item.id);
    try {
      localStorage.setItem(SELECTED_ID_STORAGE_KEY, item.id);
      // Dispatch custom event to notify other widgets in same tab
      window.dispatchEvent(new CustomEvent('localStorageChange', { 
        detail: { key: SELECTED_ID_STORAGE_KEY, value: item.id } 
      }));
    } catch {
      // Swallow storage errors (e.g., blocked access)
    }
    
    const linkParam = props.config.linkParam;
    
    if (!linkParam || !linkParam.linkType || linkParam.linkType === LinkType.None) {
      return;
    }

    // Handle page navigation
    if (linkParam.linkType === LinkType.Page && linkParam.value) {
      const targetPage = linkParam.value;
      const openType = linkParam.openType || "_self";
      
      if (openType === "_blank") {
        const currentUrl = window.location.href.split('#')[0];
        const newUrl = `${currentUrl}page/${targetPage}/`;
        window.open(newUrl, '_blank');
      } else if (openType === "_top") {
        const currentUrl = window.top.location.href.split('#')[0];
        window.top.location.href = `${currentUrl}page/${targetPage}/`;
      } else {
        jimuHistory.changePage(targetPage);
      }
    }
  };

  return (
    <div className="monitoring-results-widget">
      {/* <div className="monitoring-results-header">
        <h1 className="monitoring-results-title">MONITORING NATIJASI</h1>
      </div> */}
      <div className="monitoring-results-content">
        <div className="monitoring-results-table-section">
          <MonitoringResultsTable
            data={data}
            loading={loading}
            error={error}
            selectedRowId={selectedRowId}
            onRowClick={handleRowClick}
          />
        </div>
      </div>
    </div>
  );
};

export default Widget;

