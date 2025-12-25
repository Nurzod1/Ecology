/** @jsx jsx */
import { jsx } from 'jimu-core';
import { useRef, useEffect, useCallback, useState } from 'react';
import ZoomControls from './ZoomControls';
import { useRegionData } from './hooks/use-region-data';
import { useMapMask } from './hooks/use-map-mask';
import MapPopup from './MapPopup';
import CustomModal from './CustomModal';

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
}

interface ObjectGeoInfoProps {
  assetBasePath?: string;
}

const ObjectGeoInfo = ({ assetBasePath }: ObjectGeoInfoProps) => {
  console.time('[Custom-map-widget] ⏱️ ObjectGeoInfo render');
  const mapRef = useRef<HTMLDivElement>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [polygonData, setPolygonData] = useState<PolygonData | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const {
    geoJSONData,
    districtGeoJSON,
    selectedRegion,
    selectedDistrict,
    selectionRevision
  } = useRegionData(assetBasePath);
  
  const openPopup = useCallback((data: PolygonData, position: { x: number; y: number }) => {
    setPolygonData(data);
    setPopupPosition(position);
    setIsPopupOpen(true);
  }, []);
  
  const closePopup = useCallback(() => {
    setIsPopupOpen(false);
    // Не сбрасываем polygonData, так как он может понадобиться для модалки
    setPopupPosition(null);
  }, []);

  const openModal = useCallback(() => {
    console.log('[ObjectGeoInfo] 🔵 Открытие модалки, polygonData:', polygonData);
    setIsModalOpen(true);
    // Закрываем поп-ап, но сохраняем данные для модалки
    setIsPopupOpen(false);
  }, [polygonData]);
  
  // Сбрасываем polygonData только при закрытии модалки
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    // Можно сбросить данные после закрытия модалки, если нужно
    // setPolygonData(null);
  }, []);


  const { handleZoomIn, handleZoomOut } = useMapMask({
    mapRef,
    geoJSONData,
    districtGeoJSON,
    selectedRegion,
    selectedDistrict,
    selectionRevision,
    onShowPopup: openPopup
  });
  
  useEffect(() => {
    console.timeEnd('[Custom-map-widget] ⏱️ ObjectGeoInfo render');
  }, []);

  return (
    <div className="geo-info">
      <div
        ref={mapRef}
        className="map-container"
      >
        <MapPopup
          isOpen={isPopupOpen}
          onClose={closePopup}
          polygonData={polygonData}
          position={popupPosition}
          uploadedFiles={[]}
          photos={[]}
          onEdit={openModal}
        />
      </div>
      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      <CustomModal isOpen={isModalOpen} onClose={closeModal} polygonData={polygonData} />
    </div>
  );
};

export default ObjectGeoInfo;
