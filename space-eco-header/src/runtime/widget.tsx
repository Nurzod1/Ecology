/** @jsx jsx */
import {
  React,
  jsx,
  type AllWidgetProps,
  loadArcGISJSAPIModules
} from "jimu-core";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import sphereImage from "../assets/sphere.png";
import "./styles/widget.css";

interface IMConfig {}

interface SuggestionItem {
  id: string;
  globalid?: string;
  gid?: string;
  displayText: string;
}

const SELECTED_ID_STORAGE_KEY = "selectedId";

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [searchValue, setSearchValue] = useState<string>("");
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<string>('ru');
  const [selectedColor, setSelectedColor] = useState<string>('#19253b');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLFormElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const [languageDropdownPosition, setLanguageDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [profileDropdownPosition, setProfileDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [colorDropdownPosition, setColorDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [suggestionsPosition, setSuggestionsPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Get user email from localStorage or use default
  const getUserEmail = (): string => {
    try {
      const exbAuth = localStorage.getItem('exb_auth');
      if (exbAuth) {
        const authData = JSON.parse(exbAuth);
        return authData.email || '';
      }
    } catch (e) {
      console.error('Error parsing exb_auth:', e);
    }
    return 'user@example.com';
  };

  const userEmail = getUserEmail();
  const userInitial = userEmail.charAt(0).toUpperCase() || 'U';

  // Color options from Figma
  const colorOptions = [
    { value: '#19253b', label: 'Dark Blue' },
    { value: '#0b6baa', label: 'Blue' },
    { value: '#00888d', label: 'Teal' },
    { value: '#793b05', label: 'Brown' },
    { value: '#a0202c', label: 'Red' },
    { value: '#63289e', label: 'Purple' }
  ];

  // Map locales to display labels
  const localeMap: Record<string, { value: string; label: string }> = {
    'uz-Latn': { value: 'uz-Latn', label: 'UZ' },
    'uz-Cyrl': { value: 'uz-Cyrl', label: 'УЗ' },
    'ru': { value: 'ru', label: 'РУ' }
  };

  // Translations for profile dropdown
  const profileTranslations: Record<string, { account: string; logout: string }> = {
    'uz-Latn': { account: 'Hisob', logout: 'Hisobdan chiqish' },
    'uz-Cyrl': { account: 'Ҳисоб', logout: 'Ҳисобдан чиқиш' },
    'ru': { account: 'Аккаунт', logout: 'Выход из аккаунта' }
  };

  const getTranslation = (key: 'account' | 'logout'): string => {
    const translations = profileTranslations[currentLocale] || profileTranslations['ru'];
    return translations[key];
  };

  // Get current locale from localStorage
  useEffect(() => {
    const checkLocale = () => {
      const stored = localStorage.getItem('customLocal');
      if (stored && (stored === 'uz-Latn' || stored === 'uz-Cyrl' || stored === 'ru')) {
        setCurrentLocale(stored);
      } else {
        setCurrentLocale('ru');
      }
    };

    checkLocale();
    window.addEventListener('storage', checkLocale);
    const interval = setInterval(checkLocale, 500);

    return () => {
      window.removeEventListener('storage', checkLocale);
      clearInterval(interval);
    };
  }, []);

  // Get selected color from localStorage
  useEffect(() => {
    const storedColor = localStorage.getItem('selectedThemeColor');
    if (storedColor && colorOptions.some(c => c.value === storedColor)) {
      setSelectedColor(storedColor);
    }
  }, []);

  // Calculate language dropdown position
  useEffect(() => {
    if (isLanguageOpen && languageButtonRef.current) {
      const rect = languageButtonRef.current.getBoundingClientRect();
      setLanguageDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    } else {
      setLanguageDropdownPosition(null);
    }
  }, [isLanguageOpen]);

  // Calculate profile dropdown position
  useEffect(() => {
    if (isProfileOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect();
      setProfileDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    } else {
      setProfileDropdownPosition(null);
    }
  }, [isProfileOpen]);

  // Calculate color dropdown position
  useEffect(() => {
    if (isColorOpen && colorButtonRef.current) {
      const rect = colorButtonRef.current.getBoundingClientRect();
      setColorDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    } else {
      setColorDropdownPosition(null);
    }
  }, [isColorOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!isLanguageOpen && !isProfileOpen && !isColorOpen && !isSuggestionsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      if (isLanguageOpen && 
        languageDropdownRef.current && 
        !languageDropdownRef.current.contains(target) &&
        languageButtonRef.current &&
        !languageButtonRef.current.contains(target)
      ) {
        setIsLanguageOpen(false);
      }
      
      if (isProfileOpen &&
        profileDropdownRef.current && 
        !profileDropdownRef.current.contains(target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }

      if (isColorOpen &&
        colorDropdownRef.current && 
        !colorDropdownRef.current.contains(target) &&
        colorButtonRef.current &&
        !colorButtonRef.current.contains(target)
      ) {
        setIsColorOpen(false);
      }

      if (isSuggestionsOpen &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(target) &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setIsSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isLanguageOpen, isProfileOpen, isColorOpen, isSuggestionsOpen]);

  const handleLocaleChange = (locale: string) => {
    localStorage.setItem('customLocal', locale);
    setCurrentLocale(locale);
    setIsLanguageOpen(false);
    window.dispatchEvent(new Event('storage'));
  };

  const clearCookies = () => {
    document.cookie.split(";").forEach((cookie) => {
      const [name] = cookie.trim().split("=");
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=gis.uzspace.uz`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.uzspace.uz`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    
    try {
      const [IdentityManager] = await loadArcGISJSAPIModules([
        "esri/identity/IdentityManager",
      ]);
      IdentityManager.destroyCredentials();
      sessionStorage.clear();
      localStorage.clear();
      clearCookies();

      const logoutUrl =
        "https://gis.uzspace.uz/uzspace/sharing/rest/oauth2/signout?redirect_uri=https://gis.uzspace.uz/uzspace/home/signin.html";
      window.location.href = logoutUrl;

      setTimeout(() => {
        window.location.href =
          "https://gis.uzspace.uz/uzspace/home/signin.html";
      }, 1000);
    } catch (err) {
      window.location.href = "https://gis.uzspace.uz/uzspace/home/signin.html";
    }
  };

  const currentLabel = localeMap[currentLocale]?.label || 'РУ';

  // Render flag based on locale
  const renderFlag = (locale: string) => {
    if (locale === 'uz-Latn' || locale === 'uz-Cyrl') {
      return (
        <svg 
          className="language-flag-icon" 
          width="20" 
          height="14" 
          viewBox="0 0 513 357.071" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="geometricPrecision"
          textRendering="geometricPrecision"
          imageRendering="optimizeQuality"
        >
          <path fill="#1EB53A" fillRule="nonzero" d="M28.477.32h456.044c15.488 0 28.159 12.672 28.159 28.16v300.111c0 15.488-12.671 28.16-28.159 28.16H28.477c-15.486 0-28.157-12.672-28.157-28.16V28.48C.32 12.992 12.991.32 28.477.32z"/>
          <path fill="#0099B5" fillRule="nonzero" d="M512.68 178.536H.32V28.48C.32 12.992 12.991.32 28.477.32h456.044c15.488 0 28.159 12.672 28.159 28.16v150.056z"/>
          <path fill="#CE1126" fillRule="nonzero" d="M.32 114.377h512.36v128.317H.32z"/>
          <path fill="#fff" fillRule="nonzero" d="M.32 121.505h512.36v114.06H.32z"/>
          <path fill="#fff" d="M96.068 14.574c2.429 0 4.81.206 7.129.596-20.218 3.398-35.644 20.998-35.644 42.177 0 21.178 15.426 38.778 35.644 42.176-2.319.39-4.7.596-7.129.596-23.607 0-42.772-19.165-42.772-42.772 0-23.608 19.165-42.773 42.772-42.773zm94.1 68.437l-1.921 5.91h-6.216l5.029 3.654-1.92 5.911 5.028-3.654 5.028 3.654-1.921-5.911 5.029-3.654h-6.216l-1.92-5.91zm-39.247-18.743l1.921-5.911-5.028-3.654h6.215l1.92-5.911 1.921 5.911h6.216l-5.029 3.654 1.92 5.911-5.028-3.654-5.028 3.654zm0 34.218l1.92-5.911-5.028-3.654h6.215l1.921-5.911 1.92 5.911h6.216l-5.029 3.654 1.92 5.911-5.028-3.654-5.028 3.654zm-34.217 0l1.92-5.911-5.028-3.654h6.216l1.919-5.911 1.921 5.911h6.216l-5.029 3.654 1.92 5.911-5.027-3.654-5.028 3.654zM136.872 68.437l1.921-5.91-5.03-3.654h6.216l1.921-5.911 1.921 5.911h6.215l-5.029 3.654 1.921 5.90-5.028-3.653-5.028 3.653zm0 34.219l1.921-5.911-5.03-3.654h6.216l1.921-5.911 1.921 5.911h6.215l-5.029 3.654 1.921 5.911-5.028-3.654-5.028 3.654zm0 34.218l1.921-5.911-5.03-3.654h6.216l1.921-5.91 1.921 5.90h6.215l-5.029 3.654 1.921 5.911-5.028-3.654-5.028 3.654zm-34.218-68.437l1.92-5.90-5.029-3.654h6.216l1.921-5.911 1.92 5.911h6.216l-5.029 3.654 1.92 5.90-5.027-3.653-5.028 3.653zm0 34.219l1.92-5.911-5.029-3.654h6.216l1.921-5.911 1.92 5.911h6.216l-5.029 3.654 1.92 5.911-5.027-3.654-5.028 3.654zm0 34.218l1.92-5.911-5.029-3.654h6.216l1.921-5.90 1.92 5.90h6.216l-5.029 3.654 1.92 5.911-5.027-3.654-5.028 3.654zM185.14 30.049l1.92-5.90-5.029-3.654h6.216l1.921-5.911 1.92 5.911h6.216l-5.029 3.654 1.921 5.90-5.028-3.653-5.028 3.653zm0 34.219l1.92-5.911-5.029-3.654h6.216l1.921-5.911 1.92 5.911h6.216l-5.029 3.654 1.921 5.911-5.028-3.654-5.028 3.654z"/>
          <path fill="#CCC" fillRule="nonzero" d="M28.48 0h456.04c7.833 0 14.953 3.204 20.115 8.365C509.796 13.527 513 20.647 513 28.479v300.112c0 7.832-3.204 14.953-8.365 20.115-5.162 5.161-12.282 8.365-20.115 8.365H28.48c-7.833 0-14.953-3.204-20.115-8.365C3.204 343.544 0 336.423 0 328.591V28.479c0-7.832 3.204-14.952 8.365-20.114C13.527 3.204 20.647 0 28.48 0zm456.04.641H28.48c-7.656 0-14.616 3.132-19.661 8.178C3.773 13.864.641 20.824.641 28.479v300.112c0 7.656 3.132 14.616 8.178 19.661 5.045 5.046 12.005 8.178 19.661 8.178h456.04c7.656 0 14.616-3.132 19.661-8.178 5.046-5.045 8.178-12.005 8.178-19.661V28.479c0-7.655-3.132-14.615-8.178-19.66C499.136 3.773 492.176.641 484.52.641z"/>
        </svg>
      );
    } else if (locale === 'ru') {
      return (
        <svg 
          className="language-flag-icon" 
          width="20" 
          height="15" 
          viewBox="0 0 20 15" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="20" height="5" fill="#FFFFFF"/>
          <rect y="5" width="20" height="5" fill="#0039A6"/>
          <rect y="10" width="20" height="5" fill="#D52B1E"/>
        </svg>
      );
    }
    return null;
  };

  // Get token from localStorage or config
  const getToken = () => {
    try {
      const tokenFromStorage = localStorage.getItem('authToken') || localStorage.getItem('token');
      return tokenFromStorage || '';
    } catch (e) {
      return '';
    }
  };

  const [token, setToken] = useState<string | null>(getToken());
  const [region, setRegion] = useState<string>(() => {
    try {
      return localStorage.getItem('selectedSoato') || '1726';
    } catch {
      return '1726';
    }
  });

  // Listen for region changes in localStorage
  useEffect(() => {
    const checkRegionChange = () => {
      try {
        const currentRegion = localStorage.getItem('selectedSoato') || '1726';
        if (currentRegion !== region) {
          setRegion(currentRegion);
        }
      } catch {
        // Ignore storage errors
      }
    };

    checkRegionChange();
    const intervalId = setInterval(checkRegionChange, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [region]);

  // Fetch suggestions from API
  useEffect(() => {
    // Don't fetch suggestions if input is not focused (means it's synced from localStorage)
    if (!isSearchInputFocused) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    if (!searchValue || searchValue.trim().length < 1) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const currentRegion = region || localStorage.getItem('selectedSoato') || '1726';
        const apiBaseUrl = 'http://10.0.71.2:8000';
        const url = new URL(`${apiBaseUrl}/api/ecology/`);
        url.searchParams.append('region', currentRegion);
        url.searchParams.append('offset', '0');

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url.toString(), { headers });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const apiResponse = await response.json();
        const data = apiResponse.data || [];

        // Filter and transform suggestions based on search value
        const searchLower = searchValue.toLowerCase().trim();
        const filteredSuggestions: SuggestionItem[] = data
          .filter((item: any) => {
            const id = item.globalid || `{${item.gid}}` || '';
            return id.toLowerCase().includes(searchLower);
          })
          .slice(0, 10) // Limit to 10 suggestions
          .map((item: any) => ({
            id: item.globalid || `{${item.gid}}`,
            globalid: item.globalid,
            gid: item.gid,
            displayText: item.globalid || `{${item.gid}}` || ''
          }));

        setSuggestions(filteredSuggestions);
        setIsSuggestionsOpen(filteredSuggestions.length > 0);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
        setIsSuggestionsOpen(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Debounce API calls
    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchValue, token, region, isSearchInputFocused]);

  // Calculate suggestions dropdown position
  useEffect(() => {
    if (isSuggestionsOpen && searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect();
      setSuggestionsPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    } else {
      setSuggestionsPosition(null);
    }
  }, [isSuggestionsOpen, searchValue]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search action here
    console.log('Search:', searchValue);
    setIsSuggestionsOpen(false);
  };

  // Format ID for display - remove curly braces if present
  const formatIdForDisplay = (id: string): string => {
    if (!id) return '';
    // Remove curly braces from start and end if they exist
    return id.replace(/^\{/, '').replace(/\}$/, '');
  };

  // Get selected ID from localStorage
  const getSelectedIdFromStorage = () => {
    try {
      return localStorage.getItem(SELECTED_ID_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  };

  // Sync search value with localStorage on mount and when localStorage changes
  useEffect(() => {
    const syncFromStorage = () => {
      // Don't sync if user is currently typing in the input
      if (isSearchInputFocused) {
        return;
      }
      
      const storedId = getSelectedIdFromStorage();
      if (storedId) {
        // Format the ID for display (remove curly braces)
        const formattedId = formatIdForDisplay(storedId);
        // Only update if different to avoid unnecessary re-renders
        setSearchValue(prev => prev !== formattedId ? formattedId : prev);
        // Close suggestions dropdown when syncing from localStorage
        setIsSuggestionsOpen(false);
      }
    };

    // Sync on mount (only if input is not focused)
    if (!isSearchInputFocused) {
      syncFromStorage();
    }

    // Listen for native storage events (cross-tab)
    const handleStorageChange = (event: StorageEvent) => {
      // Don't sync if user is currently typing
      if (isSearchInputFocused) {
        return;
      }
      
      if (event.key === SELECTED_ID_STORAGE_KEY) {
        const newValue = event.newValue || '';
        const formattedId = formatIdForDisplay(newValue);
        setSearchValue(formattedId);
        // Close suggestions dropdown when syncing from localStorage
        setIsSuggestionsOpen(false);
      }
    };

    // Listen for custom storage events (same-tab)
    const handleCustomStorageChange = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageChange', handleCustomStorageChange);

    // Poll localStorage periodically to catch changes from same tab
    // Only sync when input is not focused
    const intervalId = setInterval(syncFromStorage, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange);
      clearInterval(intervalId);
    };
  }, [isSearchInputFocused]); // Re-run when focus state changes

  const handleSuggestionClick = (suggestion: SuggestionItem) => {
    // Format the display text (remove curly braces) for the search input
    const formattedDisplay = formatIdForDisplay(suggestion.displayText);
    setSearchValue(formattedDisplay);
    setIsSuggestionsOpen(false);
    setIsSearchInputFocused(false); // Reset focus state after selection
    
    // Save to localStorage (same as monitoring-results) - save the original ID with braces if needed
    try {
      localStorage.setItem(SELECTED_ID_STORAGE_KEY, suggestion.id);
      // Dispatch custom event to notify other widgets in same tab
      window.dispatchEvent(new CustomEvent('localStorageChange', { 
        detail: { key: SELECTED_ID_STORAGE_KEY, value: suggestion.id } 
      }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  };

  const handleIconClick = (iconName: string) => {
    console.log('Icon clicked:', iconName);
    // Handle icon button actions here
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    localStorage.setItem('selectedThemeColor', color);
    setIsColorOpen(false);
    // Dispatch event to notify other widgets about color change
    window.dispatchEvent(new CustomEvent('theme-color-changed', { detail: { color } }));
  };

  return (
    <div className="space-eco-header-widget">
      <header className="header-frame">
        {/* Sphere Image Background */}
        <img 
          src={sphereImage} 
          alt="Sphere" 
          className="sphere-image"
        />

        {/* Title */}
        <div className="header-title">
          Space Eco Monitoring
        </div>

        {/* Search Bar */}
        <form 
          ref={searchContainerRef}
          className="searchbar-container" 
          onSubmit={handleSearchSubmit}
        >
          <div className="searchbar-content">
            <svg 
              className="search-icon" 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M19 19L14.65 14.65" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Введите ID"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={() => {
                setIsSearchInputFocused(true);
                if (suggestions.length > 0) {
                  setIsSuggestionsOpen(true);
                }
              }}
              onBlur={() => {
                // Delay to allow suggestion click to work
                setTimeout(() => {
                  setIsSearchInputFocused(false);
                }, 200);
              }}
            />
            {isLoadingSuggestions && (
              <svg 
                className="search-loading-icon" 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle 
                  cx="8" 
                  cy="8" 
                  r="6" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeDasharray="31.416" 
                  strokeDashoffset="23.562"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 8 8"
                    to="360 8 8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            )}
          </div>
        </form>

        {/* Suggestions Dropdown */}
        {isSuggestionsOpen && suggestionsPosition && createPortal(
          <React.Fragment>
            <div 
              className="suggestions-dropdown-backdrop" 
              onClick={() => setIsSuggestionsOpen(false)}
            ></div>
            <div 
              ref={suggestionsRef}
              className="suggestions-dropdown-menu"
              style={{
                position: 'fixed',
                top: `${suggestionsPosition.top}px`,
                left: `${suggestionsPosition.left}px`,
                width: `${suggestionsPosition.width}px`
              }}
            >
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="suggestion-text">{formatIdForDisplay(suggestion.displayText)}</span>
                  </button>
                ))
              ) : (
                <div className="suggestion-item no-results">
                  <span className="suggestion-text">Нет результатов</span>
                </div>
              )}
            </div>
          </React.Fragment>,
          document.body
        )}

        {/* Right Side Actions */}
        <div className="header-right-side">
          <div className="icon-buttons-group">
            <button 
              className="icon-button"
              onClick={() => handleIconClick('notification')}
              aria-label="Notifications"
            >
              <svg width="21" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="iconGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1487C5" />
                    <stop offset="100%" stopColor="#011AFE" />
                  </linearGradient>
                </defs>
                <path d="M10.5 0C12.3425 0.000129014 13.8364 1.47265 13.837 3.28943V3.79541C16.1943 5.04557 17.7111 7.60862 17.4241 10.4385C17.2862 11.7982 17.7211 13.1542 18.6269 14.1884L19.4908 15.1746C21.2639 17.1989 19.8059 20.3416 17.0935 20.3419H13.8216C13.6683 22.019 12.2395 23.3333 10.4988 23.3333C8.75833 23.3331 7.33049 22.0188 7.17718 20.3419H3.9065C1.19397 20.3416 -0.26489 17.1991 1.508 15.1746L2.37188 14.1884C3.22104 13.2187 3.65744 11.9665 3.59483 10.6933L3.57469 10.4385C3.2881 7.60854 4.8056 5.04553 7.16296 3.79541V3.29177C7.16259 1.47416 8.65674 0 10.5 0ZM9.01279 20.3419C9.1533 21.0245 9.76519 21.5382 10.4988 21.5385C11.2326 21.5385 11.8442 21.0245 11.9848 20.3419H9.01279ZM10.4111 4.78632C7.42392 4.78632 5.08953 7.32989 5.3866 10.2609L5.41267 10.6068C5.49774 12.3388 4.90526 14.0425 3.75007 15.3616L2.88619 16.3478C2.1317 17.2094 2.75221 18.5468 3.9065 18.547H17.0935C18.1755 18.5468 18.7886 17.3715 18.2394 16.5149L18.1138 16.349L17.2487 15.3616C16.0166 13.9546 15.4257 12.1095 15.6134 10.2597C15.9105 7.32941 13.5766 4.78661 10.5901 4.78632H10.4111ZM10.5 1.79487C9.71505 1.79487 9.06853 2.38274 8.99027 3.13635C9.44786 3.04171 9.92327 2.99145 10.4111 2.99145H10.5901C11.0769 2.99149 11.5507 3.04206 12.0074 3.13635C11.929 2.38288 11.2847 1.79499 10.5 1.79487Z" fill="currentColor"/>
                <path d="M17.9386 2.58587C17.5441 2.27889 16.9717 2.34513 16.6603 2.73407C16.3488 3.12301 16.4162 3.68737 16.8106 3.99455C18.2304 5.10006 19.0303 6.64238 19.1848 8.19114L19.1982 8.28194C19.2894 8.72795 19.7104 9.04231 20.1794 8.99682C20.6795 8.94811 21.0447 8.50845 20.9956 8.01532L20.9478 7.63566C20.6596 5.7382 19.6361 3.90755 17.9386 2.58587Z" fill="currentColor"/>
                <path d="M3.06144 2.58587C3.45592 2.27889 4.02828 2.34513 4.33972 2.73407C4.65115 3.12301 4.58375 3.68737 4.18943 3.99455C2.76958 5.10006 1.96969 6.64238 1.81518 8.19114L1.80182 8.28194C1.71063 8.72795 1.28961 9.04231 0.82056 8.99682C0.320547 8.94811 -0.044744 8.50845 0.00443711 8.01532L0.0522355 7.63566C0.340428 5.7382 1.36395 3.90755 3.06144 2.58587Z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className="icon-button"
              onClick={() => handleIconClick('download')}
              aria-label="Download"
            >
              <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="iconGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1487C5" />
                    <stop offset="100%" stopColor="#011AFE" />
                  </linearGradient>
                </defs>
                <path d="M7.77252e-07 12.4383V11.5769C7.77252e-07 11.1308 0.361617 10.7692 0.807693 10.7692C1.25377 10.7692 1.61539 11.1308 1.61539 11.5769V12.4383C1.61539 14.0715 1.61616 15.232 1.71319 16.1276C1.80859 17.0079 1.98963 17.5362 2.28426 17.9417C2.5001 18.2388 2.76124 18.4999 3.05829 18.7157C3.46381 19.0104 3.99208 19.1914 4.87245 19.2868C5.76802 19.3838 6.92849 19.3846 8.56175 19.3846H12.4383C14.0715 19.3846 15.232 19.3838 16.1276 19.2868C17.0079 19.1914 17.5362 19.0104 17.9417 18.7157C18.2388 18.4999 18.4999 18.2388 18.7157 17.9417C19.0104 17.5362 19.1914 17.0079 19.2868 16.1276C19.3838 15.232 19.3846 14.0715 19.3846 12.4383V11.5769C19.3846 11.1308 19.7462 10.7692 20.1923 10.7692C20.6384 10.7692 21 11.1308 21 11.5769V12.4383C21 14.0354 21.0013 15.2983 20.8927 16.3011C20.7824 17.319 20.551 18.1646 20.023 18.8914C19.7075 19.3256 19.3256 19.7075 18.8914 20.023C18.1646 20.551 17.319 20.7824 16.3011 20.8927C15.2983 21.0013 14.0354 21 12.4383 21H8.56175C6.96463 21 5.70165 21.0013 4.69892 20.8927C3.68102 20.7824 2.83543 20.551 2.10862 20.023C1.67438 19.7075 1.29251 19.3256 0.977014 18.8914C0.448959 18.1646 0.217555 17.319 0.107272 16.3011C-0.00133934 15.2983 7.77252e-07 14.0354 7.77252e-07 12.4383ZM9.69231 0.807692C9.69231 0.361616 10.0539 -7.60284e-10 10.5 0C10.9461 3.54509e-08 11.3077 0.361616 11.3077 0.807692V11.781L13.1597 9.92894C13.4751 9.61351 13.9864 9.61351 14.3018 9.92894C14.6173 10.2444 14.6173 10.7556 14.3018 11.0711L11.0711 14.3018C10.9196 14.4533 10.7142 14.5385 10.5 14.5385C10.2858 14.5385 10.0804 14.4533 9.92894 14.3018L6.69817 11.0711C6.38274 10.7556 6.38274 10.2444 6.69817 9.92894C7.01359 9.61351 7.52487 9.61351 7.8403 9.92894L9.69231 11.781V0.807692Z" fill="currentColor"/>
              </svg>
            </button>
            <button 
              className="icon-button"
              onClick={() => handleIconClick('category')}
              aria-label="Category"
            >
              <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="iconGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1487C5" />
                    <stop offset="100%" stopColor="#011AFE" />
                  </linearGradient>
                </defs>
                <path d="M8.07692 13.1923C8.07692 13.0436 7.95638 12.9231 7.80769 12.9231H1.88462C1.73592 12.9231 1.61538 13.0436 1.61538 13.1923V19.1154C1.61538 19.2641 1.73592 19.3846 1.88462 19.3846H7.80769C7.95638 19.3846 8.07692 19.2641 8.07692 19.1154V13.1923ZM19.3846 13.1923C19.3846 13.0436 19.2641 12.9231 19.1154 12.9231H13.1923C13.0436 12.9231 12.9231 13.0436 12.9231 13.1923V19.1154C12.9231 19.2641 13.0436 19.3846 13.1923 19.3846H19.1154C19.2641 19.3846 19.3846 19.2641 19.3846 19.1154V13.1923ZM8.07692 1.88462C8.07692 1.73592 7.95638 1.61538 7.80769 1.61538H1.88462C1.73592 1.61538 1.61538 1.73592 1.61538 1.88462V7.80769C1.61538 7.95638 1.73592 8.07692 1.88462 8.07692H7.80769C7.95638 8.07692 8.07692 7.95638 8.07692 7.80769V1.88462ZM19.3846 1.88462C19.3846 1.73592 19.2641 1.61538 19.1154 1.61538H13.1923C13.0436 1.61538 12.9231 1.73592 12.9231 1.88462V7.80769C12.9231 7.95638 13.0436 8.07692 13.1923 8.07692H19.1154C19.2641 8.07692 19.3846 7.95638 19.3846 7.80769V1.88462ZM9.69231 19.1154C9.69231 20.1562 8.84854 21 7.80769 21H1.88462C0.843771 21 3.03543e-08 20.1562 0 19.1154V13.1923C0 12.1515 0.843771 11.3077 1.88462 11.3077H7.80769C8.84854 11.3077 9.69231 12.1515 9.69231 13.1923V19.1154ZM21 19.1154C21 20.1562 20.1562 21 19.1154 21H13.1923C12.1515 21 11.3077 20.1562 11.3077 19.1154V13.1923C11.3077 12.1515 12.1515 11.3077 13.1923 11.3077H19.1154C20.1562 11.3077 21 12.1515 21 13.1923V19.1154ZM9.69231 7.80769C9.69231 8.84854 8.84854 9.69231 7.80769 9.69231H1.88462C0.843771 9.69231 3.03543e-08 8.84854 0 7.80769V1.88462C0 0.843771 0.843771 3.03543e-08 1.88462 0H7.80769C8.84854 0 9.69231 0.843771 9.69231 1.88462V7.80769ZM21 7.80769C21 8.84854 20.1562 9.69231 19.1154 9.69231H13.1923C12.1515 9.69231 11.3077 8.84854 11.3077 7.80769V1.88462C11.3077 0.843771 12.1515 3.03543e-08 13.1923 0H19.1154C20.1562 0 21 0.843771 21 1.88462V7.80769Z" fill="currentColor"/>
              </svg>
            </button>
            <div className="header-color-selector">
              <button
                ref={colorButtonRef}
                className={`icon-button color-button ${isColorOpen ? 'open' : ''}`}
                onClick={() => setIsColorOpen(!isColorOpen)}
                aria-expanded={isColorOpen}
                aria-haspopup="true"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="iconGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1487C5" />
                      <stop offset="100%" stopColor="#011AFE" />
                    </linearGradient>
                  </defs>
                  <path d="M8.50299 0.20289C11.5907 -0.358302 15.2003 0.272508 18.0661 1.75123C20.9127 3.22005 23.2541 5.66092 23.3309 8.84438C23.3592 10.0238 23.1416 11.0163 22.6986 11.8289C22.2529 12.6464 21.6081 13.2268 20.8709 13.6214C19.4337 14.3907 17.6432 14.4591 16.153 14.3319C15.8544 14.3065 15.4974 14.4798 15.2426 14.8625C14.9859 15.248 14.9672 15.6437 15.0965 15.8943C15.4141 16.5095 15.8506 17.0613 16.3821 17.5209L16.6158 17.7126L16.6251 17.7196L16.6345 17.7278C17.3919 18.3494 17.9137 19.0885 17.9481 19.9328C17.9833 20.8026 17.4929 21.4843 16.8986 21.9521C15.7438 22.8611 13.7742 23.3333 11.7904 23.3333C9.64285 23.3332 7.00362 22.2705 4.80653 20.5662C2.59781 18.8528 0.696216 16.3825 0.190348 13.4298C-0.807041 7.60621 2.13727 1.35996 8.50299 0.20289ZM17.2434 3.34631C14.6938 2.03078 11.4841 1.48527 8.82437 1.96858C3.69507 2.90091 1.07851 7.98013 1.95969 13.126C2.36727 15.5058 3.93205 17.6152 5.90741 19.1476C7.89423 20.6887 10.156 21.5383 11.7904 21.5384C13.5888 21.5384 15.0865 21.0941 15.7884 20.5416C16.1217 20.2792 16.1576 20.094 16.1542 20.0064C16.1496 19.8937 16.0683 19.5844 15.4962 19.1148H15.495C14.6628 18.4653 13.9818 17.6477 13.5013 16.717C12.9955 15.7365 13.2347 14.6375 13.7479 13.8668C14.2632 13.0933 15.1892 12.4487 16.3061 12.544C17.6891 12.662 19.0517 12.5594 20.0236 12.0392C20.4908 11.7891 20.8644 11.4448 21.1233 10.97C21.3848 10.4904 21.5583 9.82351 21.5358 8.88762C21.4817 6.64389 19.8121 4.67185 17.2434 3.34631ZM9.63191 15.4152C9.63191 14.7576 9.07392 14.1756 8.32418 14.1753C7.5742 14.1753 7.01529 14.7574 7.01529 15.4152C7.01555 16.0728 7.57437 16.6539 8.32418 16.6539C9.07375 16.6536 9.63165 16.0726 9.63191 15.4152ZM9.002 8.08832C9.002 7.43056 8.4431 6.84848 7.69311 6.84848C6.94323 6.84859 6.38422 7.43063 6.38422 8.08832C6.38422 8.74601 6.94323 9.32805 7.69311 9.32816C8.4431 9.32816 9.002 8.74608 9.002 8.08832ZM17.1966 8.08832C17.1966 7.43056 16.6377 6.84848 15.8877 6.84848C15.1379 6.84866 14.5788 7.43066 14.5788 8.08832C14.5788 8.74598 15.1379 9.32799 15.8877 9.32816C16.6377 9.32816 17.1966 8.74608 17.1966 8.08832ZM11.427 15.4152C11.4267 17.1174 10.0108 18.4485 8.32418 18.4488C6.63734 18.4488 5.22049 17.1175 5.22024 15.4152C5.22024 13.7126 6.63719 12.3804 8.32418 12.3804C10.011 12.3807 11.427 13.7128 11.427 15.4152ZM10.7971 8.08832C10.7971 9.79088 9.3801 11.1231 7.69311 11.1231C6.00621 11.123 4.58917 9.79081 4.58916 8.08832C4.58916 6.38583 6.00621 5.05369 7.69311 5.05358C9.38011 5.05358 10.7971 6.38576 10.7971 8.08832ZM18.9917 8.08832C18.9917 9.79088 17.5747 11.1231 15.8877 11.1231C14.2009 11.1229 12.7838 9.79077 12.7838 8.08832C12.7838 6.38587 14.2009 5.05376 15.8877 5.05358C17.5747 5.05358 18.9917 6.38576 18.9917 8.08832Z" fill="currentColor"/>
                </svg>
              </button>

              {isColorOpen && colorDropdownPosition && createPortal(
                <React.Fragment>
                  <div className="color-dropdown-backdrop" onClick={() => setIsColorOpen(false)}></div>
                  <div 
                    ref={colorDropdownRef}
                    className="color-dropdown-menu"
                    style={{
                      position: 'fixed',
                      top: `${colorDropdownPosition.top}px`,
                      right: `${colorDropdownPosition.right}px`,
                      background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}cc 100%)`
                    }}
                  >
                    <div className="color-dropdown-title">Interfeys rangi</div>
                    <div className="color-options-container">
                      <div className="color-row">
                        {colorOptions.slice(0, 3).map((color) => (
                          <button
                            key={color.value}
                            className={`color-option ${selectedColor === color.value ? 'selected' : ''}`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleColorSelect(color.value)}
                            aria-label={color.label}
                          >
                            {selectedColor === color.value && (
                              <svg 
                                className="color-check-icon" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle cx="12" cy="12" r="12" fill="white"/>
                                <path 
                                  d="M7 12L10 15L17 8" 
                                  stroke="#000000"
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="color-row">
                        {colorOptions.slice(3, 6).map((color) => (
                          <button
                            key={color.value}
                            className={`color-option ${selectedColor === color.value ? 'selected' : ''}`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleColorSelect(color.value)}
                            aria-label={color.label}
                          >
                            {selectedColor === color.value && (
                              <svg 
                                className="color-check-icon" 
                                width="24" 
                                height="24" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle cx="12" cy="12" r="12" fill="white"/>
                                <path 
                                  d="M7 12L10 15L17 8" 
                                  stroke="#000000"
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </React.Fragment>,
                document.body
              )}
            </div>
            <div className="header-language-selector">
              <button
                ref={languageButtonRef}
                className={`icon-button language-button ${isLanguageOpen ? 'open' : ''}`}
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                aria-expanded={isLanguageOpen}
                aria-haspopup="true"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="iconGradientHover" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1487C5" />
                      <stop offset="100%" stopColor="#011AFE" />
                    </linearGradient>
                  </defs>
                  <path d="M21.5385 11.6667C21.5385 11.0223 21.4749 10.3933 21.3573 9.78416C20.3048 11.3518 18.8831 12.6501 17.2149 13.5539C17.0104 15.0519 16.5804 16.624 15.9692 18.0749C15.4974 19.1949 14.9014 20.2773 14.193 21.2101C18.4209 20.0939 21.5385 16.2453 21.5385 11.6667ZM15.2459 14.3952C14.1179 14.7585 12.9157 14.9573 11.6667 14.9573C10.4173 14.9573 9.21455 14.7587 8.08627 14.3952C8.29706 15.3923 8.61157 16.4119 9.01876 17.3785C9.71138 19.0226 10.6315 20.424 11.6667 21.3094C12.7019 20.424 13.622 19.0226 14.3146 17.3785C14.7217 16.4119 15.0351 15.3922 15.2459 14.3952ZM11.6667 2.02274C10.6312 2.90818 9.71151 4.31042 9.01876 5.95486C8.22287 7.84418 7.77778 9.93517 7.77778 11.6667C7.77778 11.8968 7.78566 12.1333 7.80115 12.3748C8.98868 12.8807 10.2947 13.1624 11.6667 13.1624C13.0382 13.1624 14.3438 12.8805 15.531 12.3748C15.5465 12.1333 15.5556 11.8968 15.5556 11.6667C15.5556 9.93517 15.1105 7.84418 14.3146 5.95486C13.6218 4.31042 12.7021 2.90818 11.6667 2.02274ZM9.13912 2.12206C6.29496 2.87321 3.95303 4.86152 2.72503 7.47863C3.45826 9.04131 4.58902 10.3791 5.98641 11.364C6.0341 9.43239 6.53226 7.23325 7.36412 5.25841C7.83594 4.13837 8.43074 3.05494 9.13912 2.12206ZM14.193 2.12206C14.9016 3.05506 15.4973 4.13815 15.9692 5.25841C16.8011 7.23324 17.2981 9.4324 17.3458 11.364C18.7434 10.3792 19.8738 9.04141 20.6071 7.47863C19.3789 4.8614 17.0375 2.87295 14.193 2.12206ZM1.79487 11.6667C1.79487 16.2449 4.91185 20.0935 9.13912 21.2101C8.43099 20.2774 7.83582 19.1947 7.36412 18.0749C6.75293 16.624 6.32177 15.0519 6.11729 13.5539C4.44924 12.65 3.02716 11.3517 1.97483 9.78416C1.85728 10.3932 1.79487 11.0224 1.79487 11.6667ZM23.3333 11.6667C23.3333 18.11 18.11 23.3333 11.6667 23.3333C5.22334 23.3333 0 18.11 0 11.6667C0 10.0591 0.3252 8.52514 0.914964 7.12924L1.08791 6.74012C2.94433 2.76035 6.98234 0 11.6667 0C16.5022 0 20.649 2.94146 22.4184 7.12924L22.6264 7.65976C23.0837 8.91034 23.3333 10.2602 23.3333 11.6667Z" fill="currentColor"/>
                </svg>
              </button>

              {isLanguageOpen && languageDropdownPosition && createPortal(
                <React.Fragment>
                  <div className="language-dropdown-backdrop" onClick={() => setIsLanguageOpen(false)}></div>
                  <div 
                    ref={languageDropdownRef}
                    className="language-dropdown-menu"
                    style={{
                      position: 'fixed',
                      top: `${languageDropdownPosition.top}px`,
                      right: `${languageDropdownPosition.right}px`
                    }}
                  >
                    <button
                      className={`language-dropdown-item ${currentLocale === 'uz-Latn' ? 'active' : ''}`}
                      onClick={() => handleLocaleChange('uz-Latn')}
                    >
                      <div className="language-item-content">
                        {renderFlag('uz-Latn')}
                        <span className="language-item-label">UZ</span>
                      </div>
                      {currentLocale === 'uz-Latn' && (
                        <svg 
                          className="language-check-icon" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path 
                            d="M13.3333 4L6 11.3333L2.66667 8" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      className={`language-dropdown-item ${currentLocale === 'uz-Cyrl' ? 'active' : ''}`}
                      onClick={() => handleLocaleChange('uz-Cyrl')}
                    >
                      <div className="language-item-content">
                        {renderFlag('uz-Cyrl')}
                        <span className="language-item-label">УЗ</span>
                      </div>
                      {currentLocale === 'uz-Cyrl' && (
                        <svg 
                          className="language-check-icon" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path 
                            d="M13.3333 4L6 11.3333L2.66667 8" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      className={`language-dropdown-item ${currentLocale === 'ru' ? 'active' : ''}`}
                      onClick={() => handleLocaleChange('ru')}
                    >
                      <div className="language-item-content">
                        {renderFlag('ru')}
                        <span className="language-item-label">РУ</span>
                      </div>
                      {currentLocale === 'ru' && (
                        <svg 
                          className="language-check-icon" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path 
                            d="M13.3333 4L6 11.3333L2.66667 8" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </React.Fragment>,
                document.body
              )}
            </div>
          </div>

          {/* User Avatar */}
          <div className="header-profile-selector">
            <button
              ref={profileButtonRef}
              className={`user-avatar profile-button ${isProfileOpen ? 'open' : ''}`}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              title={userEmail}
            >
              {userInitial}
            </button>

            {isProfileOpen && profileDropdownPosition && createPortal(
              <React.Fragment>
                <div className="profile-dropdown-backdrop" onClick={() => setIsProfileOpen(false)}></div>
                <div 
                  ref={profileDropdownRef}
                  className="profile-dropdown-menu"
                  style={{
                    position: 'fixed',
                    top: `${profileDropdownPosition.top}px`,
                    right: `${profileDropdownPosition.right}px`
                  }}
                >
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-email">
                      {/* <span className="profile-account-label">{getTranslation('account')}</span> */}
                      <span className="profile-email-value">{userEmail}</span>
                    </div>
                  </div>
                  <button
                    className="profile-dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <svg 
                      className="logout-icon" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M6 14H3C2.46957 14 1.96086 13.7893 1.58579 13.4142C1.21071 13.0391 1 12.5304 1 12V4C1 3.46957 1.21071 2.96086 1.58579 2.58579C1.96086 2.21071 2.46957 2 3 2H6M11 11L15 8M15 8L11 5M15 8H6" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{getTranslation('logout')}</span>
                  </button>
                </div>
              </React.Fragment>,
              document.body
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default Widget;

