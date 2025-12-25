import { RefObject, useEffect, useRef, useState } from 'react';
import { loadArcGISJSAPIModules } from 'jimu-arcgis';
import { MAP_CONSTRAINTS, MAP_DEFAULT_VIEW } from '../constants';
import { useEcologyPolygons } from './use-ecology-polygons';
import { getDistrictName } from '../utils/district-lookup';
import { smoothEasing, createDefaultMockSymbol, createActiveMockSymbol } from '../utils/symbols';
import { createPolygonFromFeature, createPolygonFromAllFeatures } from '../utils/geometry-utils';
import { createMaskGeometry, createMaskGraphic } from '../utils/mask-utils';
import { findDistrictFeature, findRegionFeature } from '../utils/feature-utils';
import regionsData from '../../../regions.json';

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

interface PolygonData {
  viloyat?: string;
  tuman?: string;
  mfy?: string;
  maydon?: number;
  tur?: string;
  latitude?: number;
  longitude?: number;
  yil?: string;
  'Yer toifa'?: string;
  natija?: string;
  GlobalID?: string;
  Inspektor?: string;
  Jarima_qollanildi?: string;
  Hisoblangan_zarar?: string;
  Holat_bartaraf_etildi?: string;
  buzilish?: string;
  Tekshiruv_natijasi?: string;
  gid?: number;
  globalid?: string | number;
  sana?: string;
  yer_toifa?: string;
  district?: string;
  region?: number;
  mahalla_id?: number;
  tekshirish?: string | null;
  [key: string]: any;
}

interface UseMapMaskParams {
  mapRef: RefObject<HTMLDivElement>;
  geoJSONData: any | null;
  districtGeoJSON: any | null;
  selectedRegion: string;
  selectedDistrict: string | null;
  selectionRevision: number;
  onShowPopup?: (data: PolygonData, position: { x: number; y: number }) => void;
}

interface UseMapMaskResult {
  handleZoomIn: () => Promise<void>;
  handleZoomOut: () => Promise<void>;
}

interface GeometryModules {
  geometryEngine: typeof __esri.geometryEngine;
  Polygon: typeof __esri.Polygon;
  SpatialReference: typeof __esri.SpatialReference;
  Graphic: typeof __esri.Graphic;
  webMercatorUtils: typeof __esri.webMercatorUtils;
}

const loadGeometryModules = async (): Promise<GeometryModules> => {
  const [
    geometryEngine,
    Polygon,
    SpatialReference,
    Graphic,
    webMercatorUtils,
  ] = await loadArcGISJSAPIModules([
    'esri/geometry/geometryEngine',
    'esri/geometry/Polygon',
    'esri/geometry/SpatialReference',
    'esri/Graphic',
    'esri/geometry/support/webMercatorUtils',
  ]);
  
  return { geometryEngine, Polygon, SpatialReference, Graphic, webMercatorUtils };
};

export const useMapMask = ({
  mapRef,
  geoJSONData,
  districtGeoJSON,
  selectedRegion,
  selectedDistrict,
  selectionRevision,
  onShowPopup = () => {}
}: UseMapMaskParams): UseMapMaskResult => {
  const viewRef = useRef<__esri.MapView | null>(null);
  const maskLayerRef = useRef<__esri.GraphicsLayer | null>(null);
  const ecologyLayerRef = useRef<__esri.GraphicsLayer | null>(null);
  const regionPolygonRef = useRef<__esri.Polygon | null>(null);
  const isInitializedRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const prevSelectedRegionRef = useRef<string | null>(null);
  const prevSelectedDistrictRef = useRef<string | null>(null);
  const geometryModulesRef = useRef<GeometryModules | null>(null);
  const clickHandleRef = useRef<__esri.Handle | null>(null);
  const zoomWatchHandleRef = useRef<__esri.Handle | null>(null);
  const zoomUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const symbolCacheRef = useRef<Map<string, any>>(new Map());

  const { polygonsData, fetchPolygons } = useEcologyPolygons();

  // Функция для обновления маски
  const updateMask = async (): Promise<boolean> => {
    const currentPolygon = regionPolygonRef.current;
    
    if (!maskLayerRef.current || !viewRef.current || !currentPolygon) {
      return false;
    }
    
    try {
      if (!geometryModulesRef.current) {
        geometryModulesRef.current = await loadGeometryModules();
      }
      
      const { geometryEngine, Polygon, SpatialReference, Graphic } = geometryModulesRef.current;
      
      maskLayerRef.current.removeAll();
      
      const maskGeometry = createMaskGeometry(
        currentPolygon,
        Polygon,
        SpatialReference,
        geometryEngine
      );
      
      if (maskGeometry) {
        const maskGraphic = createMaskGraphic(maskGeometry, Graphic);
        maskLayerRef.current.add(maskGraphic);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  // Функция для поиска и создания полигона региона/района
  const findAndCreateRegionPolygon = async (): Promise<__esri.Polygon | null> => {
    if (!geometryModulesRef.current) {
      geometryModulesRef.current = await loadGeometryModules();
    }
    
    const { Polygon, SpatialReference, webMercatorUtils } = geometryModulesRef.current;
    const selectedSoato = localStorage.getItem('selectedSoato');
    
    // Вычисляем region и district из selectedSoato для маски
    const { region: derivedRegion, district: derivedDistrict } = deriveRegionAndDistrict(selectedSoato);
    const selectedDistrictId = derivedDistrict;
    
    console.log('[findAndCreateRegionPolygon] 🔍 Starting search:', {
      selectedSoato,
      derivedRegion,
      derivedDistrict,
      selectedDistrictId,
      hasGeoJSONData: !!geoJSONData,
      geoJSONFeaturesCount: geoJSONData?.features?.length,
      hasDistrictGeoJSON: !!districtGeoJSON,
      districtFeaturesCount: districtGeoJSON?.features?.length
    });
    
    let feature: any = null;
    let useUzbekistanMask = false;
    let usingDistrict = false;

    // Приоритетно отображаем выбранный район, если он есть
    if (selectedDistrictId && districtGeoJSON?.features?.length) {
      usingDistrict = true;
      feature = findDistrictFeature(districtGeoJSON, selectedDistrictId);
      console.log('[findAndCreateRegionPolygon] 🔍 District search result:', {
        found: !!feature,
        selectedDistrictId
      });
    }

    // Если района нет или не найден, используем прежнюю логику по регионам
    if (!feature) {
      usingDistrict = false;
      if (!selectedSoato || selectedSoato === 'all' || derivedRegion === 'all') {
        if (geoJSONData?.features && geoJSONData.features.length > 0) {
          useUzbekistanMask = true;
          console.log('[findAndCreateRegionPolygon] 🗺️ Using Uzbekistan mask (all regions)');
        }
      } else {
        console.log('[findAndCreateRegionPolygon] 🔍 Searching for region feature:', derivedRegion);
        feature = findRegionFeature(geoJSONData, derivedRegion);
        console.log('[findAndCreateRegionPolygon] 🔍 Region search result:', {
          found: !!feature,
          derivedRegion,
          featureProperties: feature ? (feature.properties || feature.attributes) : null
        });
      }
    }

    if (useUzbekistanMask && geoJSONData?.features) {
      // Объединяем все регионы в один полигон для всего Узбекистана
      console.log('[findAndCreateRegionPolygon] ✅ Creating Uzbekistan polygon from all features');
      const polygon = createPolygonFromAllFeatures(
        geoJSONData.features,
        Polygon,
        SpatialReference,
        geometryModulesRef.current.geometryEngine
      );
      console.log('[findAndCreateRegionPolygon] ✅ Uzbekistan polygon created:', !!polygon);
      return polygon;
    } else if (feature) {
      // Создаем полигон из найденного feature
      console.log('[findAndCreateRegionPolygon] ✅ Creating polygon from feature:', {
        usingDistrict,
        hasRings: !!feature.geometry?.rings,
        hasCoordinates: !!feature.geometry?.coordinates,
        geometryType: feature.geometry?.type
      });
      
      let polygon: __esri.Polygon | null = null;
      if (usingDistrict && feature.geometry?.rings) {
        polygon = createPolygonFromFeature(feature, Polygon, SpatialReference, webMercatorUtils);
      } else {
        polygon = createPolygonFromFeature(feature, Polygon, SpatialReference);
      }
      
      console.log('[findAndCreateRegionPolygon] ✅ Polygon created:', {
        success: !!polygon,
        hasExtent: !!polygon?.extent
      });
      
      return polygon;
    }

    console.log('[findAndCreateRegionPolygon] ❌ No polygon created - feature not found');
    return null;
  };

  // Эффект для зума и маски при изменении региона
  useEffect(() => {
    if (!viewRef.current || !isInitializedRef.current) {
      return;
    }
    
    // Получаем значения из localStorage для маски
    const selectedSoato = localStorage.getItem('selectedSoato');
    const { region: derivedRegion, district: derivedDistrict } = deriveRegionAndDistrict(selectedSoato);
    
    const hasDistrictSelection = Boolean(derivedDistrict);
    if (hasDistrictSelection && !districtGeoJSON?.features?.length) {
      return;
    }

    const isFirstLoad =
      (prevSelectedRegionRef.current === null && prevSelectedDistrictRef.current === null) ||
      (prevSelectedRegionRef.current === '' && prevSelectedDistrictRef.current === '');
    const isRegionChanged = prevSelectedRegionRef.current !== derivedRegion && !isFirstLoad;
    const isDistrictChanged = prevSelectedDistrictRef.current !== (derivedDistrict || null) && !isFirstLoad;
    
    if (!isFirstLoad && !isRegionChanged && !isDistrictChanged) {
      return;
    }
    
    prevSelectedRegionRef.current = derivedRegion;
    prevSelectedDistrictRef.current = derivedDistrict || null;
    
    const zoomToRegion = async () => {
      try {
        const polygon = await findAndCreateRegionPolygon();
        
        if (!polygon) {
          return;
        }
        
        regionPolygonRef.current = polygon;
        
        const maskCreated = await updateMask();
        if (!maskCreated) {
          return;
        }
        
        const extent = polygon.extent;
        if (extent && viewRef.current) {
          const selectedSoato = localStorage.getItem('selectedSoato');
          const { region: derivedRegion } = deriveRegionAndDistrict(selectedSoato);
          const useUzbekistanMask = !selectedSoato || selectedSoato === 'all' || derivedRegion === 'all';
          const expandFactor = useUzbekistanMask ? 1.1 : 1.2;
          const expandedExtent = extent.expand(expandFactor);
          
          const isFirstRender = isFirstLoad;
          await viewRef.current.goTo(expandedExtent, {
            duration: isFirstRender ? 1200 : 1800,
            easing: smoothEasing
          });
          
          if (viewRef.current.zoom < 5) {
            await viewRef.current.goTo({
              zoom: 5
            }, {
              duration: isFirstRender ? 1000 : 1200,
              easing: smoothEasing
            });
          }
          
          updateMask();
        }
        
      } catch (error) {
      }
    };
    
    zoomToRegion();
  }, [selectedRegion, selectedDistrict, geoJSONData, districtGeoJSON, selectionRevision]);
  
  // Эффект для обновления маски при изменении extent
  useEffect(() => {
    let watchHandle: __esri.WatchHandle | null = null;
    let isUpdating = false;
    let updateTimeout: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isSetup = false;
    
    const updateMaskOnViewChange = async () => {
      if (isUpdating) {
        return;
      }
      
      if (!viewRef.current || !maskLayerRef.current || !regionPolygonRef.current) {
        return;
      }
      
      isUpdating = true;
      
      try {
        await updateMask();
      } catch (error) {
      } finally {
        isUpdating = false;
      }
    };
    
    const setupMask = () => {
      if (isSetup) {
        return true;
      }
      
      if (!viewRef.current || !maskLayerRef.current || !regionPolygonRef.current) {
        return false;
      }
      
      isSetup = true;
      updateMaskOnViewChange();
      
      watchHandle = viewRef.current.watch('extent', () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(() => {
          if (regionPolygonRef.current && !isUpdating) {
            updateMaskOnViewChange();
          }
        }, 500);
      });
      
      return true;
    };
    
    let pollAttempts = 0;
    const maxPollAttempts = 30;
    
    pollInterval = setInterval(() => {
      pollAttempts++;
      if (setupMask()) {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      } else if (pollAttempts >= maxPollAttempts) {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }, 300);
    
    if (setupMask() && pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      if (watchHandle) {
        watchHandle.remove();
      }
      if (clickHandleRef.current) {
        clickHandleRef.current.remove();
        clickHandleRef.current = null;
      }
      isSetup = false;
    };
  }, [selectedRegion, selectedDistrict, selectionRevision]);

  // Эффект для загрузки и отображения полигонов из API
  useEffect(() => {
    if (!isMapReady || !viewRef.current || !ecologyLayerRef.current) {
      return;
    }

    const loadEcologyPolygons = async () => {
      const selectedSoato = localStorage.getItem('selectedSoato');
      const selectedYear = localStorage.getItem('selectedYear');

      if (!selectedSoato || selectedSoato === 'all') {
        ecologyLayerRef.current?.removeAll();
        return;
      }

      try {
        // Передаем только selectedSoato, тип запроса определяется по длине внутри fetchPolygons
        await fetchPolygons(selectedSoato);
      } catch (error) {
        console.error('[Custom-map-widget] Error loading ecology polygons:', error);
      }
    };

    loadEcologyPolygons();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedYear' || e.key === 'status' || e.key === null) {
        loadEcologyPolygons();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    let lastYear = localStorage.getItem('selectedYear');
    let lastStatus = localStorage.getItem('status');
    const checkYearInterval = setInterval(() => {
      const currentYear = localStorage.getItem('selectedYear');
      const currentStatus = localStorage.getItem('status');
      if (currentYear !== lastYear || currentStatus !== lastStatus) {
        lastYear = currentYear;
        lastStatus = currentStatus;
        loadEcologyPolygons();
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkYearInterval);
    };
  }, [selectedRegion, selectedDistrict, selectionRevision, fetchPolygons, isMapReady]);

  // Эффект для отображения полигонов на карте
  useEffect(() => {
    if (!polygonsData) {
      return;
    }

    if (!viewRef.current || !ecologyLayerRef.current || !geometryModulesRef.current) {
      return;
    }

    const displayPolygons = async () => {
      const { Polygon, SpatialReference, Graphic } = geometryModulesRef.current!;
      
      ecologyLayerRef.current?.removeAll();

      const currentZoom = viewRef.current?.zoom || MAP_DEFAULT_VIEW.zoom;
      const graphics: __esri.Graphic[] = [];
      const BATCH_SIZE = 50;

      let processedCount = 0;
      for (const feature of polygonsData.features) {
        if (!feature.geometry || !feature.geometry.coordinates) continue;

        try {
          const polygonType = feature.properties?.tur !== undefined 
            ? feature.properties.tur 
            : feature.properties?.type !== undefined 
            ? feature.properties.type 
            : null;

          const polygon = createPolygonFromFeature(feature, Polygon, SpatialReference);
          
          if (!polygon) continue;

          const graphic = new Graphic({
            geometry: polygon,
            attributes: {
              __ecology: true,
              properties: feature.properties
            },
            symbol: createDefaultMockSymbol(currentZoom, symbolCacheRef.current, polygonType)
          });

          graphics.push(graphic);
          processedCount++;
        } catch (e) {
        }
      }

      const addBatch = (index: number) => {
        const batch = graphics.slice(index, index + BATCH_SIZE);
        if (batch.length > 0 && ecologyLayerRef.current) {
          ecologyLayerRef.current.addMany(batch);
          
          if (index + BATCH_SIZE < graphics.length) {
            requestAnimationFrame(() => {
              addBatch(index + BATCH_SIZE);
            });
          }
        }
      };

      addBatch(0);
    };

    displayPolygons();
  }, [polygonsData]);

  // Эффект для зума на полигон при изменении selectedId в localStorage
  useEffect(() => {
    if (!isMapReady || !viewRef.current || !ecologyLayerRef.current) {
      return;
    }

    const zoomToPolygonByGlobalId = async () => {
      const selectedId = localStorage.getItem('selectedId');
      
      console.log('[Custom-map-widget] 🔍 zoomToPolygonByGlobalId called, selectedId:', selectedId);
      
      if (!selectedId) {
        console.log('[Custom-map-widget] ⚠️ No selectedId in localStorage');
        return;
      }

      // Нормализуем globalid - убираем фигурные скобки и приводим к верхнему регистру для сравнения
      const normalizeGlobalId = (gid: string): string => {
        return gid.replace(/[{}]/g, '').toUpperCase();
      };

      // Ищем как с фигурными скобками, так и без них
      const selectedIdWithBraces = selectedId.startsWith('{') && selectedId.endsWith('}') 
        ? selectedId 
        : `{${selectedId}}`;
      const selectedIdWithoutBraces = normalizeGlobalId(selectedId);
      const normalizedSelectedId = selectedIdWithoutBraces;
      
      console.log('[Custom-map-widget] 🔍 Searching for selectedId (with braces):', selectedIdWithBraces);
      console.log('[Custom-map-widget] 🔍 Searching for selectedId (without braces):', normalizedSelectedId);
      
      if (!ecologyLayerRef.current || !viewRef.current) {
        console.log('[Custom-map-widget] ⚠️ Missing ecologyLayer or viewRef');
        return;
      }

      // Собираем информацию о всех полигонах для отладки
      const allPolygonsInfo: Array<{ gid?: any; GlobalID?: any; globalid?: any; normalizedGid?: string; normalizedGlobalId?: string }> = [];
      ecologyLayerRef.current.graphics.forEach(g => {
        if (g.attributes?.__ecology) {
          const props = g.attributes.properties || {};
          const gid = props.gid;
          const globalId = props.GlobalID || props.globalid;
          allPolygonsInfo.push({
            gid: gid,
            GlobalID: props.GlobalID,
            globalid: props.globalid,
            normalizedGid: gid !== undefined && gid !== null ? String(gid).toUpperCase() : undefined,
            normalizedGlobalId: globalId ? normalizeGlobalId(String(globalId)) : undefined
          });
        }
      });
      console.log('[Custom-map-widget] 📊 Total polygons on map:', allPolygonsInfo.length);
      console.log('[Custom-map-widget] 📊 All polygons info:', allPolygonsInfo);
      console.log('[Custom-map-widget] 🔍 Searching for ID with braces:', selectedIdWithBraces);
      console.log('[Custom-map-widget] 🔍 Searching for ID without braces:', normalizedSelectedId);
      
      // Проверяем, есть ли совпадения в собранных данных
      const potentialMatches = allPolygonsInfo.filter(p => {
        const gidMatch = p.normalizedGid && p.normalizedGid === normalizedSelectedId;
        const globalIdMatch = (p.GlobalID && (String(p.GlobalID) === selectedIdWithBraces || String(p.GlobalID).toUpperCase() === selectedIdWithBraces.toUpperCase())) ||
                              (p.globalid && (String(p.globalid) === selectedIdWithBraces || String(p.globalid).toUpperCase() === selectedIdWithBraces.toUpperCase())) ||
                              (p.normalizedGlobalId && p.normalizedGlobalId === normalizedSelectedId);
        return gidMatch || globalIdMatch;
      });
      console.log('[Custom-map-widget] 🔍 Potential matches in collected data:', potentialMatches.length, potentialMatches);

      let foundGraphic: __esri.Graphic | null = null;
      let combinedExtent: __esri.Extent | null = null;
      let selectedCount = 0;
      const foundMatches: Array<{ type: string; value: any }> = [];

      // Ищем полигон по globalid
      let checkedCount = 0;
      ecologyLayerRef.current.graphics.forEach((g, index) => {
        if (g.attributes?.__ecology) {
          checkedCount++;
          const props = g.attributes.properties || {};
          
          // Проверяем gid (числовой идентификатор)
          const gid = props.gid;
          if (gid !== undefined && gid !== null) {
            const gidString = String(gid).toUpperCase();
            if (gidString === normalizedSelectedId) {
              console.log('[Custom-map-widget] ✅ Match found by gid at index', index, 'gid:', gid, 'normalized:', gidString);
              foundGraphic = g;
              selectedCount++;
              foundMatches.push({ type: 'gid', value: gid });
              
              if (g.geometry) {
                const polyExtent = (g.geometry as __esri.Polygon).extent;
                if (polyExtent) {
                  if (combinedExtent) {
                    combinedExtent = combinedExtent.union(polyExtent);
                  } else {
                    combinedExtent = polyExtent;
                  }
                }
              }
            }
          }

          // Проверяем GlobalID (строковый идентификатор в формате {GUID})
          const globalId = props.GlobalID || props.globalid;
          if (globalId) {
            const globalIdString = String(globalId);
            const normalizedGlobalId = normalizeGlobalId(globalIdString);
            
            // Проверяем совпадение как с фигурными скобками, так и без них
            const matchesWithBraces = globalIdString === selectedIdWithBraces || globalIdString.toUpperCase() === selectedIdWithBraces.toUpperCase();
            const matchesWithoutBraces = normalizedGlobalId === normalizedSelectedId;
            
            if (matchesWithBraces || matchesWithoutBraces) {
              console.log('[Custom-map-widget] ✅ Match found by GlobalID at index', index, 'GlobalID:', globalIdString, 'matchesWithBraces:', matchesWithBraces, 'matchesWithoutBraces:', matchesWithoutBraces);
              if (!foundGraphic) {
                foundGraphic = g;
              }
              selectedCount++;
              foundMatches.push({ type: 'GlobalID', value: globalIdString });
              
              if (g.geometry) {
                const polyExtent = (g.geometry as __esri.Polygon).extent;
                if (polyExtent) {
                  if (combinedExtent) {
                    combinedExtent = combinedExtent.union(polyExtent);
                  } else {
                    combinedExtent = polyExtent;
                  }
                }
              }
            }
          }
        }
      });
      console.log('[Custom-map-widget] 🔍 Checked', checkedCount, 'polygons during search');

      console.log('[Custom-map-widget] 🔍 Found matches:', foundMatches.length, foundMatches);
      console.log('[Custom-map-widget] 🔍 foundGraphic:', !!foundGraphic, 'combinedExtent:', !!combinedExtent);

      if (foundGraphic && combinedExtent) {
        console.log('[Custom-map-widget] ✅ Polygon found, zooming...');
        // Сбрасываем все символы на дефолтные
        const currentZoom = viewRef.current.zoom || MAP_DEFAULT_VIEW.zoom;
        ecologyLayerRef.current.graphics.forEach(g => {
          if (g.attributes?.__ecology) {
            const props = g.attributes.properties || {};
            const polygonType = props.tur !== undefined ? props.tur : props.type !== undefined ? props.type : null;
            const resetSymbol = createDefaultMockSymbol(currentZoom, symbolCacheRef.current, polygonType);
            g.symbol = resetSymbol;
          }
        });

        // Выделяем найденные полигоны активным символом
        ecologyLayerRef.current.graphics.forEach(g => {
          if (g.attributes?.__ecology) {
            const props = g.attributes.properties || {};
            const gid = props.gid;
            const globalId = props.GlobalID || props.globalid;
            
            let matches = false;
            if (gid !== undefined && gid !== null) {
              const gidString = String(gid).toUpperCase();
              if (gidString === normalizedSelectedId) {
                matches = true;
              }
            }
            if (!matches && globalId) {
              const globalIdString = String(globalId);
              const normalizedGlobalId = normalizeGlobalId(globalIdString);
              const matchesWithBraces = globalIdString === selectedIdWithBraces || globalIdString.toUpperCase() === selectedIdWithBraces.toUpperCase();
              const matchesWithoutBraces = normalizedGlobalId === normalizedSelectedId;
              if (matchesWithBraces || matchesWithoutBraces) {
                matches = true;
              }
            }

            if (matches) {
              const polygonType = props.tur !== undefined ? props.tur : props.type !== undefined ? props.type : null;
              const activeSymbol = createActiveMockSymbol(polygonType);
              g.symbol = activeSymbol;
            }
          }
        });

        // Делаем зум на найденный полигон
        try {
          console.log('[Custom-map-widget] 🎯 Starting zoom to extent:', combinedExtent);
          await viewRef.current.goTo(combinedExtent.expand(1.2), {
            duration: 1500,
            easing: smoothEasing
          });
          console.log('[Custom-map-widget] ✅ Zoom completed successfully');
        } catch (error) {
          console.error('[Custom-map-widget] ❌ Zoom error:', error);
        }
      } else {
        console.log('[Custom-map-widget] ❌ Polygon not found or no extent');
      }
    };

    // Выполняем зум сразу при монтировании, если selectedId уже есть
    zoomToPolygonByGlobalId();

    // Отслеживаем изменения selectedId через polling (так как storage event не всегда срабатывает в той же вкладке)
    let lastSelectedId = localStorage.getItem('selectedId');
    console.log('[Custom-map-widget] 🔄 Starting selectedId polling, initial value:', lastSelectedId);
    const checkSelectedIdInterval = setInterval(() => {
      const currentSelectedId = localStorage.getItem('selectedId');
      if (currentSelectedId !== lastSelectedId) {
        console.log('[Custom-map-widget] 🔄 selectedId changed:', {
          from: lastSelectedId,
          to: currentSelectedId
        });
        lastSelectedId = currentSelectedId;
        zoomToPolygonByGlobalId();
      }
    }, 500);

    // Также слушаем storage event для изменений из других вкладок
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedId' || e.key === null) {
        console.log('[Custom-map-widget] 🔄 Storage event triggered, selectedId:', e.newValue);
        zoomToPolygonByGlobalId();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(checkSelectedIdInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isMapReady, polygonsData]);
  
  // Инициализация карты
  useEffect(() => {
    if (!mapRef.current || isInitializedRef.current) return;
    if (viewRef.current) return;

    let view: __esri.MapView | null = null;

    const initMap = async () => {
      try {
        const [
          Map,
          MapView,
          GraphicsLayer,
        ] = await loadArcGISJSAPIModules([
          'esri/Map',
          'esri/views/MapView',
          'esri/layers/GraphicsLayer',
        ]);
        
        geometryModulesRef.current = await loadGeometryModules();
        const map = new Map({
          basemap: 'hybrid'
        });
        
        const maskLayer = new GraphicsLayer({
          opacity: 1.0,
          visible: true,
          title: 'Region Mask'
        });
        map.add(maskLayer);
        maskLayerRef.current = maskLayer;

        const ecologyLayer = new GraphicsLayer({
          opacity: 0.7,
          visible: true,
          title: 'Ecology Polygons'
        });
        map.add(ecologyLayer);
        ecologyLayerRef.current = ecologyLayer;

        view = new MapView({
          container: mapRef.current!,
          map: map,
          center: MAP_DEFAULT_VIEW.center,
          zoom: MAP_DEFAULT_VIEW.zoom,
          minZoom: MAP_CONSTRAINTS.minZoom,
          maxZoom: MAP_CONSTRAINTS.maxZoom,
          ui: {
            components: []
          }
        });

        view.when(async () => {
          
          viewRef.current = view;
          isInitializedRef.current = true;
          setIsMapReady(true);
          
          view.constraints = {
            minZoom: MAP_CONSTRAINTS.minZoom,
            maxZoom: MAP_CONSTRAINTS.maxZoom
          };
          
          if (zoomWatchHandleRef.current) {
            zoomWatchHandleRef.current.remove();
          }
          
          zoomWatchHandleRef.current = view.watch('zoom', (newZoom: number) => {
            if (newZoom < MAP_CONSTRAINTS.minZoom) {
              view?.goTo({
                zoom: MAP_CONSTRAINTS.minZoom
              }, {
                duration: 800,
                easing: smoothEasing
              }).catch(() => {
                // Ignore errors
              });
            }
            
            if (zoomUpdateTimeoutRef.current) {
              clearTimeout(zoomUpdateTimeoutRef.current);
            }
            
            zoomUpdateTimeoutRef.current = setTimeout(() => {
              if (ecologyLayerRef.current) {
                const roundedZoom = Math.round(newZoom * 2) / 2;
                
                ecologyLayerRef.current.graphics.forEach(g => {
                  if (g.attributes?.__ecology) {
                    const currentSymbol = g.symbol as any;
                    if (currentSymbol?.type === 'picture-fill') {
                      const props = g.attributes.properties || {};
                      const polygonType = props.tur !== undefined ? props.tur : props.type !== undefined ? props.type : null;
                      const newSymbol = createDefaultMockSymbol(roundedZoom, symbolCacheRef.current, polygonType);
                      g.symbol = newSymbol;
                    }
                  }
                });
              }
            }, 150);
          });
          
          if (!clickHandleRef.current) {
            clickHandleRef.current = view.on('click', async (event) => {
              try {
                const hit = await view.hitTest(event);
                const ecologyHit = hit.results?.find((r: any) => 
                  r.graphic?.attributes?.__ecology
                ) as any;
                
                if (ecologyHit?.graphic?.geometry) {
                  const attributes = ecologyHit.graphic.attributes;
                  const props = attributes.properties || {};
                  
                  // Выводим все данные выбранного полигона из API
                  console.log('═══════════════════════════════════════════════════════════');
                  console.log('🟢 [Custom-map-widget] КЛИК ПО ПОЛИГОНУ - Данные из API');
                  console.log('═══════════════════════════════════════════════════════════');
                  console.log('📋 Все properties полигона из API:', props);
                  console.log('🔑 Все ключи properties:', Object.keys(props));
                  console.log('📊 Все значения properties:');
                  Object.entries(props).forEach(([key, value]) => {
                    console.log(`   - ${key}:`, value);
                  });
                  console.log('═══════════════════════════════════════════════════════════');
                  
                  const clickedGid = props.gid;
                  const clickedPolygonType = props.tur !== undefined ? props.tur : props.type !== undefined ? props.type : null;
                  
                  if (ecologyLayerRef.current && viewRef.current) {
                    const currentZoom = viewRef.current.zoom || MAP_DEFAULT_VIEW.zoom;
                    ecologyLayerRef.current.graphics.forEach(g => {
                      if (g.attributes?.__ecology) {
                        const props = g.attributes.properties || {};
                        const polygonType = props.tur !== undefined ? props.tur : props.type !== undefined ? props.type : null;
                        const resetSymbol = createDefaultMockSymbol(currentZoom, symbolCacheRef.current, polygonType);
                        g.symbol = resetSymbol;
                      }
                    });
                  }
                  
                  let combinedExtent: __esri.Extent | null = null;
                  let selectedCount = 0;
                  
                  if (ecologyLayerRef.current && clickedGid !== undefined && clickedGid !== null) {
                    ecologyLayerRef.current.graphics.forEach(g => {
                      if (g.attributes?.__ecology) {
                        const gProps = g.attributes.properties || {};
                        const gGid = gProps.gid;
                        
                        if (gGid === clickedGid || String(gGid) === String(clickedGid)) {
                          const polygonType = gProps.tur !== undefined ? gProps.tur : gProps.type !== undefined ? gProps.type : null;
                          const activeSymbol = createActiveMockSymbol(polygonType);
                          g.symbol = activeSymbol;
                          selectedCount++;
                          
                          if (g.geometry) {
                            const polyExtent = (g.geometry as __esri.Polygon).extent;
                            if (polyExtent) {
                              if (combinedExtent) {
                                combinedExtent = combinedExtent.union(polyExtent);
                              } else {
                                combinedExtent = polyExtent;
                              }
                            }
                          }
                        }
                      }
                    });
                  } else {
                    const activeSymbol = createActiveMockSymbol(clickedPolygonType);
                    ecologyHit.graphic.symbol = activeSymbol;
                    combinedExtent = (ecologyHit.graphic.geometry as __esri.Polygon).extent;
                  }
                  
                  const extent = combinedExtent || (ecologyHit.graphic.geometry as __esri.Polygon).extent;
                  
                  const mapContainer = mapRef.current;
                  if (mapContainer) {
                    const mapPoint = event.mapPoint;
                    const screenPoint = view.toScreen(mapPoint);
                    const rect = mapContainer.getBoundingClientRect();
                    const x = screenPoint.x - rect.left;
                    const y = screenPoint.y - rect.top;
                    
                    const regionCode = props.region ? String(props.region) : null;
                    const regionInfo = regionCode ? regionsData.find(r => r.region_soato === regionCode) : null;
                    const currentLocale = localStorage.getItem('customLocal') || 'ru';
                    const localeKey = currentLocale === 'uz-Cyrl' ? 'uz-Cyrl' : currentLocale === 'uz-Latn' ? 'uz-Latn' : 'ru';
                    
                    // Обрабатываем globalid - если уже есть фигурные скобки, оставляем как есть
                    let processedGlobalId = '';
                    if (props.globalid) {
                      const globalidStr = String(props.globalid);
                      processedGlobalId = globalidStr.startsWith('{') && globalidStr.endsWith('}') 
                        ? globalidStr 
                        : `{${globalidStr}}`;
                    } else if (props.GlobalID) {
                      const globalidStr = String(props.GlobalID);
                      processedGlobalId = globalidStr.startsWith('{') && globalidStr.endsWith('}') 
                        ? globalidStr 
                        : `{${globalidStr}}`;
                    } else if (props.gid) {
                      processedGlobalId = `{${props.gid}}`;
                    }
                    
                    const basePolygonData: PolygonData = {
                      viloyat: regionInfo ? regionInfo[localeKey] : props.viloyat || '',
                      tuman: props.tuman || '',
                      mfy: props.mfy || '',
                      maydon: props.maydon !== undefined && props.maydon !== null ? props.maydon : 0,
                      tur: props.tur || '',
                      latitude: props.latitude ? parseFloat(String(props.latitude)) : undefined,
                      longitude: props.longitude ? parseFloat(String(props.longitude)) : undefined,
                      yil: props.sana || props.yil || '',
                      'Yer toifa': props.yer_toifa || props['Yer toifa'] || '',
                      natija: props.natija || '',
                      GlobalID: processedGlobalId,
                      Inspektor: props.Inspektor || props.tekshirish || '',
                      Jarima_qollanildi: props.Jarima_qollanildi || '',
                      Hisoblangan_zarar: props.Hisoblangan_zarar || '',
                      Holat_bartaraf_etildi: props.Holat_bartaraf_etildi || '',
                      buzilish: props.buzilish || '',
                      Tekshiruv_natijasi: props.Tekshiruv_natijasi || props.tekshirish || '',
                      gid: props.gid !== undefined && props.gid !== null ? Number(props.gid) : undefined,
                      globalid: props.globalid || processedGlobalId.replace(/[{}]/g, ''),
                      sana: props.sana,
                      yer_toifa: props.yer_toifa,
                      district: props.district,
                      region: props.region,
                      mahalla_id: props.mahalla_id,
                      tekshirish: props.tekshirish
                    };
                    
                    console.log('[Custom-map-widget] 📦 basePolygonData для модалки:', basePolygonData);
                    
                    if (extent) {
                      await view.goTo(extent.expand(1.2), {
                        duration: 1500,
                        easing: smoothEasing
                      });
                    }
                    
                    onShowPopup(basePolygonData, { x, y });
                    
                    if (props.district) {
                      getDistrictName(String(props.district), localeKey).then(districtName => {
                        if (districtName) {
                          const updatedData: PolygonData = {
                            ...basePolygonData,
                            tuman: districtName
                          };
                          onShowPopup(updatedData, { x, y });
                        }
                      }).catch(() => {
                      });
                    }
                  }
                }
              } catch {
                // ignore
              }
            });
          }
          
          if (maskLayerRef.current) {
            try {
              const { geometryEngine, Polygon, SpatialReference, Graphic } = geometryModulesRef.current!;
              
              const selectedSoato = localStorage.getItem('selectedSoato');
              
              // Вычисляем region и district из selectedSoato для маски
              const { region: derivedRegion, district: derivedDistrict } = deriveRegionAndDistrict(selectedSoato);
              const selectedDistrictId = derivedDistrict;
              
              let initialPolygon: __esri.Polygon | null = null;
              
              if (selectedDistrictId && districtGeoJSON?.features?.length) {
                const districtFeature = findDistrictFeature(districtGeoJSON, selectedDistrictId);
                if (districtFeature) {
                  initialPolygon = createPolygonFromFeature(
                    districtFeature,
                    Polygon,
                    SpatialReference,
                    geometryModulesRef.current.webMercatorUtils
                  );
                }
              }

              if (!initialPolygon) {
                if (!selectedSoato || selectedSoato === 'all' || derivedRegion === 'all') {
                  if (geoJSONData?.features && geoJSONData.features.length > 0) {
                    initialPolygon = createPolygonFromAllFeatures(
                      geoJSONData.features,
                      Polygon,
                      SpatialReference,
                      geometryEngine
                    );
                  }
                } else if (geoJSONData) {
                  const regionFeature = findRegionFeature(geoJSONData, derivedRegion);
                  if (regionFeature) {
                    initialPolygon = createPolygonFromFeature(regionFeature, Polygon, SpatialReference);
                  }
                }
              }
              
              if (initialPolygon) {
                regionPolygonRef.current = initialPolygon;
                  
                maskLayerRef.current.removeAll();
                
                const maskGeometry = createMaskGeometry(
                  initialPolygon,
                  Polygon,
                  SpatialReference,
                  geometryEngine
                );
                
                if (maskGeometry) {
                  const maskGraphic = createMaskGraphic(maskGeometry, Graphic);
                  maskLayerRef.current.add(maskGraphic);
                }
                  
                if (viewRef.current && initialPolygon) {
                  const extent = initialPolygon.extent;
                  if (extent) {
                    const selectedSoato = localStorage.getItem('selectedSoato');
                    const useUzbekistanMask = !selectedSoato || selectedSoato === 'all';
                    const expandFactor = useUzbekistanMask ? 1.1 : 1.2;
                    viewRef.current.goTo(extent.expand(expandFactor), {
                      duration: 1500,
                      easing: smoothEasing
                    }).then(() => {
                      if (!useUzbekistanMask && viewRef.current && viewRef.current.zoom < 5) {
                        viewRef.current.goTo({
                          zoom: 5
                        }, {
                          duration: 1000,
                          easing: smoothEasing
                        }).catch(() => {});
                      }
                    }).catch(() => {});
                  }
                }
              }
            } catch (error) {
            }
          }
          
          if (geoJSONData) {
            prevSelectedRegionRef.current = '';
            setTimeout(() => {
              if (viewRef.current && geoJSONData) {
                prevSelectedRegionRef.current = '';
              }
            }, 100);
          }
        }).catch(() => {
        });

      } catch (err) {
      }
    };

    initMap();

    return () => {
      if (view) {
        view.destroy();
        viewRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [geoJSONData, mapRef]);

  const handleZoom = async (direction: 1 | -1) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentZoom = view.zoom ?? MAP_DEFAULT_VIEW.zoom;
    const constraintKey = direction > 0 ? 'maxZoom' : 'minZoom';
    const targetZoom = direction > 0
      ? Math.min(view.constraints?.[constraintKey] ?? MAP_CONSTRAINTS.maxZoom, currentZoom + 1)
      : Math.max(view.constraints?.[constraintKey] ?? MAP_CONSTRAINTS.minZoom, currentZoom - 1);

    try {
      await view.goTo({ zoom: targetZoom }, { 
        duration: 1000, 
        easing: smoothEasing 
      });
    } catch {
      // Ignore errors
    }
  };

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      if (zoomUpdateTimeoutRef.current) {
        clearTimeout(zoomUpdateTimeoutRef.current);
      }
      if (zoomWatchHandleRef.current) {
        zoomWatchHandleRef.current.remove();
      }
      symbolCacheRef.current.clear();
    };
  }, []);

  return {
    handleZoomIn: () => handleZoom(1),
    handleZoomOut: () => handleZoom(-1)
  };
};
