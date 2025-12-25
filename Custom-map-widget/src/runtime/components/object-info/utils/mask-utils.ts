// Утилиты для работы с масками карты

import { MAP_EXTENT } from '../constants';

export const createMaskGeometry = (
  regionPolygon: __esri.Polygon,
  Polygon: typeof __esri.Polygon,
  SpatialReference: typeof __esri.SpatialReference,
  geometryEngine: typeof __esri.geometryEngine
): __esri.Polygon | null => {
  const largeExtent = {
    xmin: MAP_EXTENT.xmin,
    xmax: MAP_EXTENT.xmax,
    ymin: MAP_EXTENT.ymin,
    ymax: MAP_EXTENT.ymax
  };
  
  const worldPolygon = new Polygon({
    rings: [[
      [largeExtent.xmin, largeExtent.ymin],
      [largeExtent.xmax, largeExtent.ymin],
      [largeExtent.xmax, largeExtent.ymax],
      [largeExtent.xmin, largeExtent.ymax],
      [largeExtent.xmin, largeExtent.ymin]
    ]],
    spatialReference: SpatialReference.WGS84
  });
  
  // Используем оригинальную геометрию без упрощения для точного отображения
  const maskGeometry = geometryEngine.difference(worldPolygon, regionPolygon);
  
  return maskGeometry as __esri.Polygon | null;
};

export const createMaskGraphic = (
  maskGeometry: __esri.Polygon,
  Graphic: typeof __esri.Graphic
): __esri.Graphic => {
  return new Graphic({
    geometry: maskGeometry,
    symbol: {
      type: 'simple-fill',
      color: [6, 10, 24, 0.72],
      outline: {
        color: [0, 0, 0, 0],
        width: 0
      }
    } as any
  });
};

