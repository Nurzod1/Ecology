// Утилиты для поиска features в GeoJSON

import regionsData from '../../../regions.json';

export const findDistrictFeature = (
  districtGeoJSON: any,
  selectedDistrictId: string
): any => {
  if (!districtGeoJSON?.features?.length || !selectedDistrictId) {
    return null;
  }

  return districtGeoJSON.features.find((f: any) => {
    const attrs = f.attributes || f.properties || {};
    const districtCode = `${attrs.district ?? ''}`;
    const soatoCode = `${attrs.soato ?? ''}`;
    return districtCode === selectedDistrictId || soatoCode === selectedDistrictId;
  });
};

export const findRegionFeature = (
  geoJSONData: any,
  selectedRegion: string
): any => {
  if (!geoJSONData?.features || !selectedRegion || selectedRegion === 'all') {
    return null;
  }

  // Нормализуем selectedRegion к строке для сравнения
  const normalizedSelectedRegion = String(selectedRegion);
  
  const regionData = regionsData.find(r => r.region_soato === normalizedSelectedRegion);
  
  console.log('[findRegionFeature] Searching for region:', normalizedSelectedRegion);
  console.log('[findRegionFeature] Found regionData:', regionData);
  console.log('[findRegionFeature] Total features in geoJSON:', geoJSONData.features?.length);
  
  // Шаг 1: Ищем по region_soato И shapeISO одновременно (точное совпадение)
  if (regionData?.amcharts_id) {
    const feature = geoJSONData.features.find((f: any) => {
      const props = f.properties || {};
      const regionSoato = String(props.region_soato || '');
      const shapeISO = String(props.shapeISO || '');
      const matches = regionSoato === normalizedSelectedRegion && shapeISO === regionData.amcharts_id;
      if (matches) {
        console.log('[findRegionFeature] ✅ Found by region_soato + shapeISO:', {
          region_soato: regionSoato,
          shapeISO: shapeISO
        });
      }
      return matches;
    });
    
    if (feature) {
      return feature;
    }
  }
  
  // Шаг 2: Ищем только по region_soato
  const feature = geoJSONData.features.find((f: any) => {
    const props = f.properties || {};
    const regionSoato = String(props.region_soato || '');
    const matches = regionSoato === normalizedSelectedRegion;
    if (matches) {
      console.log('[findRegionFeature] ✅ Found by region_soato only:', {
        region_soato: regionSoato,
        shapeISO: props.shapeISO
      });
    }
    return matches;
  });
  
  if (feature) {
    return feature;
  }
  
  // Шаг 3: Если не нашли по region_soato, ищем только по shapeISO (fallback)
  if (regionData?.amcharts_id) {
    const featureByShapeISO = geoJSONData.features.find((f: any) => {
      const props = f.properties || {};
      const shapeISO = String(props.shapeISO || '');
      const matches = shapeISO === regionData.amcharts_id;
      if (matches) {
        console.log('[findRegionFeature] ✅ Found by shapeISO only (fallback):', {
          region_soato: props.region_soato,
          shapeISO: shapeISO,
          expectedRegion: normalizedSelectedRegion
        });
      }
      return matches;
    });
    
    if (featureByShapeISO) {
      return featureByShapeISO;
    }
  }
  
  console.log('[findRegionFeature] ❌ Feature not found for region:', normalizedSelectedRegion);
  return null;
};

