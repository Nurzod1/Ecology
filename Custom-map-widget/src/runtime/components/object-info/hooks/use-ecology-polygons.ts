import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://10.0.71.2:8000';

interface EcologyFeature {
  type: 'Feature';
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: number[][][][] | number[][][];
  };
  properties: {
    gid: number;
    sana?: string;
    tur?: string;
    yer_toifa?: string;
    natija?: string;
    maydon?: number;
    district?: string;
    region?: number;
    mahalla_id?: number;
    tekshirish?: string | null;
    latitude?: string;
    longitude?: string;
    [key: string]: any;
  };
}

interface EcologyGeoJSON {
  type: 'FeatureCollection';
  features: EcologyFeature[];
}

export const useEcologyPolygons = () => {
  const [polygonsData, setPolygonsData] = useState<EcologyGeoJSON | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPolygons = useCallback(async (selectedSoato?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/api/ecology/geojson`);
      
      // Определяем тип запроса по длине selectedSoato
      if (selectedSoato && selectedSoato !== 'all') {
        const soatoLength = selectedSoato.length;
        
        if (soatoLength === 4) {
          // 4 знака -> region (например, 1726)
          url.searchParams.append('region', selectedSoato);
          console.log('[Custom-map-widget] Request type: region, soato:', selectedSoato);
        } else if (soatoLength === 7) {
          // 7 знаков -> district (например, 1726262)
          url.searchParams.append('district', selectedSoato);
          console.log('[Custom-map-widget] Request type: district, soato:', selectedSoato);
        } else if (soatoLength === 10) {
          // 10 знаков -> mahalla_id (например, 1724413001)
          url.searchParams.append('mahalla_id', selectedSoato);
          console.log('[Custom-map-widget] Request type: mahalla_id, soato:', selectedSoato);
        } else {
          console.warn('[Custom-map-widget] Unknown soato length:', soatoLength, 'soato:', selectedSoato);
        }
      }

      // Add status filter if exists
      const status = localStorage.getItem('status');
      if (status) {
        url.searchParams.append('status', status);
      }

      console.log('[Custom-map-widget] Fetching polygons from:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: EcologyGeoJSON = await response.json();
      
      // Фильтрация по году из localStorage
      let filteredData = data;
      const selectedYear = localStorage.getItem('selectedYear');
      
      if (selectedYear) {
        console.log('[Custom-map-widget] Filtering polygons by year:', selectedYear);
        const filteredFeatures = data.features.filter(feature => {
          const sana = feature.properties?.sana;
          const yil = feature.properties?.yil;
          
          // Функция для извлечения года из строки
          const extractYear = (value: any): string | null => {
            if (!value) return null;
            const str = String(value).trim();
            
            // Если это просто год (4 цифры)
            if (/^\d{4}$/.test(str)) {
              return str;
            }
            
            // Если это дата в формате YYYY-MM-DD или YYYY/MM/DD
            if (str.includes('-') || str.includes('/')) {
              const parts = str.split(/[-/]/);
              if (parts.length > 0 && /^\d{4}$/.test(parts[0])) {
                return parts[0];
              }
            }
            
            // Пытаемся извлечь первые 4 цифры
            const yearMatch = str.match(/^\d{4}/);
            if (yearMatch) {
              return yearMatch[0];
            }
            
            return null;
          };
          
          // Проверяем поле sana
          if (sana) {
            const yearFromSana = extractYear(sana);
            if (yearFromSana === selectedYear) {
              return true;
            }
          }
          
          // Проверяем поле yil
          if (yil) {
            const yearFromYil = extractYear(yil);
            if (yearFromYil === selectedYear) {
              return true;
            }
          }
          
          return false;
        });
        
        filteredData = {
          ...data,
          features: filteredFeatures
        };
        
        console.log('[Custom-map-widget] Filtered polygons:', {
          original: data.features.length,
          filtered: filteredFeatures.length,
          year: selectedYear
        });
      } else {
        console.log('[Custom-map-widget] No year filter applied (selectedYear not found in localStorage)');
      }
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔵 [Custom-map-widget] ПЕРВЫЙ РЕНДЕР - Данные с API');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📡 URL запроса:', url.toString());
      console.log('📊 Количество полигонов:', filteredData.features?.length || 0);
      if (selectedYear) {
        console.log('📅 Фильтр по году:', selectedYear);
      }
      console.log('');
      console.log('✅ ЧТО ПРИХОДИТ: ВСЕ ДАННЫЕ ВСЕХ ПОЛИГОНОВ');
      console.log('   - Геокоординаты (geometry.coordinates)');
      console.log('   - Все properties каждого полигона');
      console.log('');
      if (filteredData.features && filteredData.features.length > 0) {
        const firstFeature = filteredData.features[0];
        console.log('🔍 Пример первого полигона:');
        console.log('   📐 Geometry:', {
          type: firstFeature.geometry.type,
          hasCoordinates: !!firstFeature.geometry.coordinates,
          coordinatesLength: Array.isArray(firstFeature.geometry.coordinates) 
            ? firstFeature.geometry.coordinates.length 
            : 0
        });
        console.log('   📋 Properties (ВСЕ ДАННЫЕ):', firstFeature.properties);
        console.log('   🔑 Все ключи properties:', Object.keys(firstFeature.properties || {}));
        console.log('');
        console.log('📊 Статистика по всем полигонам:');
        const allPropertyKeys = new Set<string>();
        filteredData.features.forEach(f => {
          if (f.properties) {
            Object.keys(f.properties).forEach(key => allPropertyKeys.add(key));
          }
        });
        console.log('   - Уникальных ключей properties:', allPropertyKeys.size);
        console.log('   - Список всех ключей:', Array.from(allPropertyKeys));
      }
      console.log('═══════════════════════════════════════════════════════════');
      
      setPolygonsData(filteredData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch polygons';
      setError(errorMessage);
      console.error('[Custom-map-widget] Error fetching ecology polygons:', err);
      setPolygonsData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    polygonsData,
    loading,
    error,
    fetchPolygons
  };
};
