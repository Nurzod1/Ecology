import { useCallback, useEffect, useState } from 'react';
console.time('[Custom-map-widget] ⏱️ Importing region.json');
import inlineRegionGeoJSON from '../../../region.json';
console.timeEnd('[Custom-map-widget] ⏱️ Importing region.json');
import { WIDGET_NAME } from '../constants';

const hasInlineRegion = Boolean(inlineRegionGeoJSON?.features?.length);

interface UseRegionDataResult {
  geoJSONData: any | null;
  selectedRegion: string;
  setSelectedRegion: (value: string) => void;
  districtGeoJSON: any | null;
  selectedDistrict: string | null;
  setSelectedDistrict: (value: string | null) => void;
  selectionRevision: number;
}

// Функция для вычисления region и district из selectedSoato
const deriveRegionAndDistrict = (selectedSoato: string | null): { region: string; district: string | null } => {
  if (!selectedSoato || selectedSoato === 'all') {
    return { region: 'all', district: null };
  }
  
  const soatoLength = selectedSoato.length;
  
  if (soatoLength === 4) {
    // 4 знака -> это region (например, 1726)
    return { region: selectedSoato, district: null };
  } else if (soatoLength === 7) {
    // 7 знаков -> это district (например, 1726262)
    // region = первые 4 знака
    return { region: selectedSoato.substring(0, 4), district: selectedSoato };
  } else if (soatoLength === 10) {
    // 10 знаков -> это mahalla_id (например, 1724413001)
    // region = первые 4 знака, district = первые 7 знаков
    return { region: selectedSoato.substring(0, 4), district: selectedSoato.substring(0, 7) };
  }
  
  // Если длина не соответствует ожидаемым значениям, возвращаем как есть
  return { region: selectedSoato, district: null };
};

export const useRegionData = (assetBasePath?: string): UseRegionDataResult => {
  console.time('[Custom-map-widget] ⏱️ useRegionData initialization');
  const [geoJSONData, setGeoJSONData] = useState<any | null>(
    hasInlineRegion ? inlineRegionGeoJSON : null
  );

  // Вычисляем начальные значения из selectedSoato
  const initialSoato = localStorage.getItem('selectedSoato');
  const { region: initialRegion, district: initialDistrict } = deriveRegionAndDistrict(initialSoato);

  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(initialDistrict);
  const [districtGeoJSON, setDistrictGeoJSON] = useState<any | null>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  
  useEffect(() => {
    if (geoJSONData || hasInlineRegion) {
      console.timeEnd('[Custom-map-widget] ⏱️ useRegionData initialization');
    }
  }, [geoJSONData]);

  useEffect(() => {
    const handleRegionChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      // Нормализуем к строке на случай, если передано число
      const normalizedDetail = detail ? String(detail) : 'all';
      setSelectedRegion(normalizedDetail);
    };

    const handleDistrictChange = (event: Event) => {
      const detail = (event as CustomEvent<string | null>).detail;
      setSelectedDistrict(detail || null);
    };

    window.addEventListener('custom-map-region-change', handleRegionChange);
    window.addEventListener('custom-map-district-change', handleDistrictChange);

    (window as any).customMapSelectRegion = (soato: string | number) => {
      // Нормализуем к строке на случай, если передано число
      const normalizedSoato = soato ? String(soato) : 'all';
      window.dispatchEvent(new CustomEvent('custom-map-region-change', { detail: normalizedSoato }));
    };

    (window as any).customMapSelectDistrict = (districtId: string | null) => {
      window.dispatchEvent(new CustomEvent('custom-map-district-change', { detail: districtId }));
    };

    // Глобальная функция для удаления selectedSoato с автоматическим событием
    (window as any).customMapRemoveSoato = () => {
      localStorage.removeItem('selectedSoato');
      window.dispatchEvent(new CustomEvent('custom-map-soato-removed'));
    };

    (window as any).customMapRemoveDistrict = () => {
      localStorage.removeItem('selectedDistrict');
      window.dispatchEvent(new CustomEvent('custom-map-district-removed'));
    };

    const handleStorage = () => {
      const soato = localStorage.getItem('selectedSoato');
      
      // Вычисляем region и district из selectedSoato
      const { region, district } = deriveRegionAndDistrict(soato);
      
      // Обновляем selectedRegion если изменился
      if (region !== selectedRegion) {
        setSelectedRegion(region);
        setSelectionRevision(r => r + 1);
      }
      
      // Обновляем selectedDistrict если изменился
      if (district !== selectedDistrict) {
        setSelectedDistrict(district);
        setSelectionRevision(r => r + 1);
      }
    };

    // Обработка удаления через storage event (срабатывает в других вкладках/окнах)
    window.addEventListener('storage', handleStorage);
    
    // Обработка удаления selectedSoato в том же окне через кастомное событие
    const handleSoatoRemoved = () => {
      const soato = localStorage.getItem('selectedSoato');
      const { region, district } = deriveRegionAndDistrict(soato);
      
      if (region !== selectedRegion) {
        setSelectedRegion(region);
        setSelectionRevision(r => r + 1);
      }
      if (district !== selectedDistrict) {
        setSelectedDistrict(district);
        setSelectionRevision(r => r + 1);
      }
    };
    window.addEventListener('custom-map-soato-removed', handleSoatoRemoved);

    const handleDistrictRemoved = () => {
      // Теперь district вычисляется из selectedSoato, поэтому просто обновляем из soato
      const soato = localStorage.getItem('selectedSoato');
      const { region, district } = deriveRegionAndDistrict(soato);
      
      if (region !== selectedRegion) {
        setSelectedRegion(region);
        setSelectionRevision(r => r + 1);
      }
      if (district !== selectedDistrict) {
        setSelectedDistrict(district);
        setSelectionRevision(r => r + 1);
      }
    };
    window.addEventListener('custom-map-district-removed', handleDistrictRemoved);

    // Проверяем localStorage при монтировании и при изменении selectedRegion
    const checkLocalStorage = () => {
      const soato = localStorage.getItem('selectedSoato');
      
      // Вычисляем region и district из selectedSoato
      const { region, district } = deriveRegionAndDistrict(soato);
      
      // Обновляем selectedRegion если изменился
      if (region !== selectedRegion) {
        setSelectedRegion(region);
        setSelectionRevision(r => r + 1);
      }
      
      // Обновляем selectedDistrict если изменился
      if (district !== selectedDistrict) {
        setSelectedDistrict(district);
        setSelectionRevision(r => r + 1);
      }
    };

    checkLocalStorage();

    // Периодическая синхронизация с localStorage (обновляем сразу в той же вкладке)
    const pollInterval = setInterval(() => {
      const soato = localStorage.getItem('selectedSoato');
      
      // Вычисляем region и district из selectedSoato
      const { region, district } = deriveRegionAndDistrict(soato);
      
      // Обновляем selectedRegion если изменился
      if (region !== selectedRegion) {
        setSelectedRegion(region);
        setSelectionRevision(r => r + 1);
      }
      
      // Обновляем selectedDistrict если изменился
      if (district !== selectedDistrict) {
        setSelectedDistrict(district);
        setSelectionRevision(r => r + 1);
      }
    }, 150);

    return () => {
      window.removeEventListener('custom-map-region-change', handleRegionChange);
      window.removeEventListener('custom-map-district-change', handleDistrictChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('custom-map-soato-removed', handleSoatoRemoved);
      window.removeEventListener('custom-map-district-removed', handleDistrictRemoved);
      clearInterval(pollInterval);
    };
  }, [selectedRegion, selectedDistrict]);

  const loadRegionGeoJSON = useCallback(async () => {
    if (hasInlineRegion && geoJSONData) {
      return;
    }

    console.time('[Custom-map-widget] region load');
    const origin = window.location.origin;
    const baseUrl = (window as any).jimuConfig?.baseUrl || '';
    const normalizedFolder = assetBasePath
      ? assetBasePath.endsWith('/') ? assetBasePath : `${assetBasePath}/`
      : '';

    const pathsToTry = [
      normalizedFolder ? `${normalizedFolder}dist/runtime/region.json` : null,
      normalizedFolder ? `${normalizedFolder}src/runtime/region.json` : null,
      normalizedFolder ? `${normalizedFolder}region.json` : null,
      `${origin}/widgets/${WIDGET_NAME}/dist/runtime/region.json`,
      `${baseUrl}/widgets/${WIDGET_NAME}/dist/runtime/region.json`,
      './region.json',
      './dist/runtime/region.json',
      './dist/runtime/assets/region.json'
    ].filter(Boolean) as string[];

    for (const path of pathsToTry) {
      try {
        console.log('[Custom-map-widget] Trying region file:', path);
        const response = await fetch(path);
        if (response.ok) {
          const data = await response.json();
          if (data?.features?.length) {
            setGeoJSONData(data);
            console.timeEnd('[Custom-map-widget] region load');
            console.log('[Custom-map-widget] region file loaded:', path);
            return;
          }
        }
      } catch (error) {
        console.warn('[Custom-map-widget] Failed to load region file:', path, error);
      }
    }

    if (!geoJSONData) {
      console.error('[Custom-map-widget] Не удалось загрузить region.geojson');
      console.timeEnd('[Custom-map-widget] region load');
    }
  }, [assetBasePath, geoJSONData]);

  const loadDistrictGeoJSON = useCallback(async () => {
    if (districtGeoJSON) {
      return;
    }

    // Загружаем районы только когда они понадобятся (есть selectedDistrict)
    if (!selectedDistrict) {
      return;
    }

    console.time('[Custom-map-widget] district load');
    const origin = window.location.origin;
    const baseUrl = (window as any).jimuConfig?.baseUrl || '';
    const normalizedFolder = assetBasePath
      ? assetBasePath.endsWith('/') ? assetBasePath : `${assetBasePath}/`
      : '';

    const pathsToTry = [
      normalizedFolder ? `${normalizedFolder}dist/runtime/districtttt.json` : null,
      normalizedFolder ? `${normalizedFolder}src/runtime/districtttt.json` : null,
      normalizedFolder ? `${normalizedFolder}districtttt.json` : null,
      `${origin}/widgets/${WIDGET_NAME}/dist/runtime/districtttt.json`,
      `${baseUrl}/widgets/${WIDGET_NAME}/dist/runtime/districtttt.json`,
      './districtttt.json',
      './dist/runtime/districtttt.json'
    ].filter(Boolean) as string[];

    for (const path of pathsToTry) {
      try {
        console.log('[Custom-map-widget] Trying district file:', path);
        const response = await fetch(path);
        if (response.ok) {
          const data = await response.json();
          if (data?.features?.length) {
            setDistrictGeoJSON(data);
            console.timeEnd('[Custom-map-widget] district load');
            console.log('[Custom-map-widget] district file loaded:', path);
            return;
          }
        }
      } catch (error) {
        console.warn('[Custom-map-widget] Failed to load district file:', path, error);
      }
    }

    if (!districtGeoJSON) {
      console.error('[Custom-map-widget] Не удалось загрузить districtttt.json');
      console.timeEnd('[Custom-map-widget] district load');
    }
  }, [assetBasePath, districtGeoJSON, selectedDistrict]);

  useEffect(() => {
    loadRegionGeoJSON();
  }, [loadRegionGeoJSON]);

  useEffect(() => {
    loadDistrictGeoJSON();
  }, [loadDistrictGeoJSON]);

  return {
    geoJSONData,
    selectedRegion,
    setSelectedRegion,
    districtGeoJSON,
    selectedDistrict,
    setSelectedDistrict,
    selectionRevision
  };
};

