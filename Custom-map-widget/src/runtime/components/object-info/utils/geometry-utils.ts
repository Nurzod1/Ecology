// Утилиты для работы с геометрией

export const convertRingsFromWebMercatorToWGS84 = (
  rings: number[][][],
  webMercatorUtils: typeof __esri.webMercatorUtils
): number[][][] => {
  return rings.map(ring =>
    ring.map(coord => {
      const [x, y] = coord;
      const [lon, lat] = webMercatorUtils.xyToLngLat(x, y);
      return [lon, lat];
    })
  );
};

export const createPolygonFromFeature = (
  feature: any,
  Polygon: typeof __esri.Polygon,
  SpatialReference: typeof __esri.SpatialReference,
  webMercatorUtils?: typeof __esri.webMercatorUtils
): __esri.Polygon | null => {
  if (!feature?.geometry) {
    return null;
  }

  const coordinates = feature.geometry.coordinates;

  if (feature.geometry.type === 'Polygon') {
    const rings = coordinates as number[][][];
    if (rings.length === 0) {
      return null;
    }

    // Если это Web Mercator координаты (из districtGeoJSON), конвертируем
    if (feature.geometry.rings && webMercatorUtils) {
      try {
        const convertedRings = convertRingsFromWebMercatorToWGS84(
          feature.geometry.rings,
          webMercatorUtils
        );
        return new Polygon({
          rings: convertedRings,
          spatialReference: SpatialReference.WGS84
        });
      } catch (e) {
        console.warn('[Custom-map-widget] Failed to convert district geometry:', e);
        return null;
      }
    }

    return new Polygon({
      rings: rings,
      spatialReference: SpatialReference.WGS84
    });
  } else if (feature.geometry.type === 'MultiPolygon') {
    const multiCoords = coordinates as number[][][][];
    const allRings: number[][][] = [];
    
    for (const polygonRings of multiCoords) {
      if (polygonRings && polygonRings.length > 0) {
        allRings.push(...polygonRings);
      }
    }
    
    if (allRings.length === 0) {
      return null;
    }
    
    return new Polygon({
      rings: allRings,
      spatialReference: SpatialReference.WGS84
    });
  }

  return null;
};

export const createPolygonFromAllFeatures = (
  features: any[],
  Polygon: typeof __esri.Polygon,
  SpatialReference: typeof __esri.SpatialReference,
  geometryEngine: typeof __esri.geometryEngine
): __esri.Polygon | null => {
  const polygons: __esri.Polygon[] = [];
  
  for (const feat of features) {
    if (!feat.geometry) continue;
    
    const coordinates = feat.geometry.coordinates;
    
    if (feat.geometry.type === 'Polygon') {
      const rings = coordinates as number[][][];
      if (rings.length > 0) {
        try {
          const poly = new Polygon({
            rings: rings,
            spatialReference: SpatialReference.WGS84
          });
          polygons.push(poly);
        } catch (e) {
          console.warn('[Custom-map-widget] Failed to create polygon from feature:', e);
        }
      }
    } else if (feat.geometry.type === 'MultiPolygon') {
      const multiCoords = coordinates as number[][][][];
      for (const polygonRings of multiCoords) {
        if (polygonRings && polygonRings.length > 0) {
          try {
            const poly = new Polygon({
              rings: polygonRings,
              spatialReference: SpatialReference.WGS84
            });
            polygons.push(poly);
          } catch (e) {
            console.warn('[Custom-map-widget] Failed to create polygon from MultiPolygon feature:', e);
          }
        }
      }
    }
  }
  
  if (polygons.length > 0) {
    return geometryEngine.union(polygons) as __esri.Polygon;
  }
  
  return null;
};

