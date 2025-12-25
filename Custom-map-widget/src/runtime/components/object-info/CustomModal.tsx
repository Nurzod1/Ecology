import React, { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CustomModal.css';
import { useLocale } from './hooks/useLocale';
import CustomDropdown from './CustomDropdown';

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

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  polygonData?: PolygonData | null;
}

// SVG иконка upload
const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 13V13.8C21 16.7998 21 18.2997 20.2361 19.3511C19.9893 19.6907 19.6907 19.9893 19.3511 20.2361C18.2997 21 16.7998 21 13.8 21H10.2C7.20021 21 5.70032 21 4.64886 20.2361C4.30928 19.9893 4.01065 19.6907 3.76393 19.3511C3 18.2997 3 16.7998 3 13.8V13M12 15V3M12 3L9 6M12 3L15 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const API_BASE_URL = 'http://10.0.71.2:8000';

const CustomModal = ({ isOpen, onClose, polygonData }: CustomModalProps) => {
  const { t, locale } = useLocale();
  const [fullPolygonData, setFullPolygonData] = useState<PolygonData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  
  console.log('[CustomModal] 🔵 Компонент рендерится, isOpen:', isOpen, 'polygonData:', polygonData);

  // Локализованные опции для dropdown'ов
  const objectIdOptions = useMemo(() => [
    t('modal.fields.objectId.options.default'),
    t('modal.fields.objectId.options.id001'),
    t('modal.fields.objectId.options.id002'),
    t('modal.fields.objectId.options.id003')
  ], [t]);

  const yearOptions = useMemo(() => [
    t('modal.fields.year.options.2025'),
    t('modal.fields.year.options.2024'),
    t('modal.fields.year.options.2023'),
    t('modal.fields.year.options.2022')
  ], [t]);

  const resultOptions = useMemo(() => [
    t('modal.fields.result.options.approved'),
    t('modal.fields.result.options.rejected'),
    t('modal.fields.result.options.review')
  ], [t]);

  // Значения по умолчанию с учетом локализации
  const defaultYear = useMemo(() => t('modal.fields.year.options.2025'), [t]);
  const defaultResult = useMemo(() => t('modal.fields.result.options.approved'), [t]);

  // Инициализация данных формы - начинаем с пустых значений
  const [formData, setFormData] = useState({
    objectId: '',
    year: defaultYear,
    area: '',
    inspector: '',
    damage: '',
    fine: '',
    note: '',
    result: defaultResult
  });
  

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обновляем значения по умолчанию при изменении локали (только если нет данных из полигона)
  useEffect(() => {
    if (!polygonData) {
      setFormData(prev => ({
        ...prev,
        year: defaultYear,
        result: defaultResult
      }));
    }
  }, [defaultYear, defaultResult, polygonData]);

  // Загрузка полных данных полигона из API
  useEffect(() => {
    if (!isOpen || !polygonData) {
      setFullPolygonData(null);
      return;
    }

    const fetchFullPolygonData = async () => {
      // Получаем globalid для запроса
      let globalid = '';
      if (polygonData?.globalid) {
        const globalidStr = String(polygonData.globalid);
        globalid = globalidStr.replace(/[{}]/g, '');
      } else if (polygonData?.GlobalID) {
        globalid = String(polygonData.GlobalID).replace(/[{}]/g, '');
      } else if (polygonData?.gid) {
        globalid = String(polygonData.gid);
      }

      if (!globalid) {
        console.log('[CustomModal] ⚠️ No globalid found, using provided data');
        setFullPolygonData(polygonData);
        return;
      }

      setLoadingData(true);
      try {
        // Запрашиваем все полигоны и ищем нужный по globalid
        const url = new URL(`${API_BASE_URL}/api/ecology/geojson`);
        const selectedSoato = localStorage.getItem('selectedSoato');
        
        // Определяем тип запроса по длине selectedSoato
        if (selectedSoato && selectedSoato !== 'all') {
          const soatoLength = selectedSoato.length;
          
          if (soatoLength === 4) {
            // 4 знака -> region (например, 1726)
            url.searchParams.append('region', selectedSoato);
          } else if (soatoLength === 7) {
            // 7 знаков -> district (например, 1726262)
            url.searchParams.append('district', selectedSoato);
          } else if (soatoLength === 10) {
            // 10 знаков -> mahalla_id (например, 1724413001)
            url.searchParams.append('mahalla_id', selectedSoato);
          }
        }

        // Add status filter if exists
        const status = localStorage.getItem('status');
        if (status) {
          url.searchParams.append('status', status);
        }

        console.log('[CustomModal] 🔍 Запрос данных полигона из API, globalid:', globalid, 'selectedSoato:', selectedSoato);
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Ищем полигон по globalid
        const normalizeGlobalId = (gid: string): string => {
          return gid.replace(/[{}]/g, '').toUpperCase();
        };
        
        const normalizedSearchId = normalizeGlobalId(globalid);
        const foundFeature = data.features?.find((feature: any) => {
          const props = feature.properties || {};
          const featureGlobalId = props.globalid || props.GlobalID || (props.gid ? String(props.gid) : '');
          const normalizedFeatureId = normalizeGlobalId(String(featureGlobalId));
          return normalizedFeatureId === normalizedSearchId;
        });

        if (foundFeature) {
          const props = foundFeature.properties || {};
          console.log('[CustomModal] ✅ Найден полигон в API:', props);
          
          const fullData: PolygonData = {
            ...polygonData,
            // Обновляем данными из API
            globalid: props.globalid || props.GlobalID || props.gid,
            maydon: props.maydon !== undefined ? props.maydon : polygonData.maydon,
            sana: props.sana || props.yil || polygonData.sana || polygonData.yil,
            Inspektor: props.Inspektor || props.tekshirish || polygonData.Inspektor,
            Jarima_qollanildi: props.Jarima_qollanildi || polygonData.Jarima_qollanildi,
            Hisoblangan_zarar: props.Hisoblangan_zarar || polygonData.Hisoblangan_zarar,
            buzilish: props.buzilish || polygonData.buzilish,
            Tekshiruv_natijasi: props.Tekshiruv_natijasi || props.tekshirish || polygonData.Tekshiruv_natijasi,
            ...props
          };
          
          setFullPolygonData(fullData);
        } else {
          console.log('[CustomModal] ⚠️ Полигон не найден в API, используем предоставленные данные');
          setFullPolygonData(polygonData);
        }
      } catch (error) {
        console.error('[CustomModal] ❌ Ошибка загрузки данных из API:', error);
        setFullPolygonData(polygonData);
      } finally {
        setLoadingData(false);
      }
    };

    fetchFullPolygonData();
  }, [isOpen, polygonData]);

  // Обновляем форму при открытии модального окна с данными полигона
  useEffect(() => {
    const dataToUse = fullPolygonData || polygonData;
    
    if (isOpen && dataToUse) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [CustomModal] МОДАЛКА ОТКРЫТА - Данные полигона');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 Все данные polygonData:', dataToUse);
      console.log('🔑 Все ключи polygonData:', Object.keys(dataToUse));
      console.log('📊 Все значения polygonData:');
      Object.entries(dataToUse).forEach(([key, value]) => {
        console.log(`   - ${key}:`, value);
      });
      console.log('═══════════════════════════════════════════════════════════');
      
      // Приоритет: globalid > GlobalID > gid
      // Для objectId сохраняем фигурные скобки, если они есть, или добавляем их
      let globalid = '';
      if (dataToUse?.globalid) {
        const globalidStr = String(dataToUse.globalid);
        globalid = globalidStr.startsWith('{') && globalidStr.endsWith('}') 
          ? globalidStr 
          : `{${globalidStr}}`;
      } else if (dataToUse?.GlobalID) {
        const globalidStr = String(dataToUse.GlobalID);
        globalid = globalidStr.startsWith('{') && globalidStr.endsWith('}') 
          ? globalidStr 
          : `{${globalidStr}}`;
      } else if (dataToUse?.gid) {
        globalid = `{${dataToUse.gid}}`;
      }
      
      const sana = dataToUse?.sana || dataToUse?.yil || '';
      const maydon = dataToUse?.maydon !== undefined && dataToUse?.maydon !== null 
        ? String(dataToUse.maydon) 
        : '';
      
      console.log('[CustomModal] 🔍 Извлеченные значения:');
      console.log('   - globalid:', globalid);
      console.log('   - sana:', sana);
      console.log('   - maydon:', maydon);
      console.log('   - maydon type:', typeof dataToUse?.maydon);
      console.log('   - maydon value:', dataToUse?.maydon);
      console.log('   - maydon !== undefined:', dataToUse?.maydon !== undefined);
      console.log('   - maydon !== null:', dataToUse?.maydon !== null);
      console.log('   - dataToUse keys:', Object.keys(dataToUse));
      
      const newFormData = {
        objectId: globalid || '',
        year: sana || '',
        area: maydon || '',
        inspector: dataToUse?.Inspektor || dataToUse?.tekshirish || '',
        damage: dataToUse?.Hisoblangan_zarar || '',
        fine: dataToUse?.Jarima_qollanildi || '',
        note: dataToUse?.buzilish || '',
        result: dataToUse?.Tekshiruv_natijasi || dataToUse?.tekshirish || ''
      };
      
      console.log('[CustomModal] 🔍 Проверка значений перед установкой:');
      console.log('   - objectId будет:', newFormData.objectId);
      console.log('   - area будет:', newFormData.area, '(maydon:', maydon, ')');
      console.log('   - year будет:', newFormData.year);
      console.log('[CustomModal] 📝 Новые данные формы:', newFormData);
      
      setFormData(prev => {
        const updated = {
          ...prev,
          ...newFormData
        };
        console.log('[CustomModal] ✅ Обновленные данные формы:', updated);
        console.log('[CustomModal] ✅ prev был:', prev);
        console.log('[CustomModal] ✅ newFormData был:', newFormData);
        console.log('[CustomModal] ✅ updated будет:', updated);
        return updated;
      });
      
      // Принудительно проверяем, что данные установились
      setTimeout(() => {
        setFormData(current => {
          console.log('[CustomModal] ⏰ Проверка через setTimeout, текущий formData:', current);
          return current;
        });
      }, 100);
    }
  }, [isOpen, fullPolygonData, polygonData]);

  // Очистка файла при закрытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setUploadedFile(null);
      setUploadError(null);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    const maxSize = 15 * 1024 * 1024; // 15 МБ
    const allowedTypes = ['.csv', '.shp'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      return t('modal.fields.fileUpload.errors.invalidType');
    }

    if (file.size > maxSize) {
      return t('modal.fields.fileUpload.errors.tooLarge');
    }

    return null;
  }, [t]);

  const handleFileSelect = useCallback((file: File) => {
    setUploadError(null);
    const error = validateFile(file);
    
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadedFile(file);
  }, [validateFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  const handleSubmit = useCallback(() => {
    const submitData = {
      ...formData,
      file: uploadedFile
    };
    console.log('Form data:', submitData);
    // Здесь можно добавить отправку данных на сервер
    onClose();
  }, [formData, uploadedFile, onClose]);

  // Логируем текущее состояние formData при каждом рендере
  console.log('[CustomModal] 🎨 Рендер компонента, formData:', formData);
  console.log('[CustomModal] 🎨 isOpen:', isOpen, 'polygonData:', polygonData);
  console.log('[CustomModal] 🎨 fullPolygonData:', fullPolygonData);
  
  // Создаем контейнер для портала
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      let container = document.getElementById('custom-map-modal-portal');
      if (!container) {
        container = document.createElement('div');
        container.id = 'custom-map-modal-portal';
        document.body.appendChild(container);
      }
      setPortalContainer(container);
    }

    // Очистка контейнера при размонтировании
    return () => {
      if (typeof document !== 'undefined') {
        const container = document.getElementById('custom-map-modal-portal');
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    };
  }, []);
  
  if (!isOpen || !portalContainer) return null;

  const modalContent = (
    <div
      id="custom-map-modal"
      className="custom-modal-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="custom-modal">
        <div className="custom-modal__header">
          <div className="custom-modal__title">{t('modal.title')}</div>
          <button
            type="button"
            className="custom-modal__close"
            aria-label={t('modal.close')}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="custom-modal__body">
          {/* Row 1: Obyekt ID - full width (read-only) */}
          <div className="custom-modal__row custom-modal__row--full">
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.objectId.label')}</span>
              <input
                type="text"
                className="custom-modal__input custom-modal__input--readonly"
                value={formData.objectId}
                readOnly
                disabled
              />
            </label>
          </div>

          {/* Row 2: Monitoring yili (read-only) + Hudud maydoni (read-only) */}
          <div className="custom-modal__row custom-modal__row--half">
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.year.label')}</span>
              <input
                type="text"
                className="custom-modal__input custom-modal__input--readonly"
                value={formData.year}
                readOnly
                disabled
              />
            </label>
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.area.label')}</span>
              <input
                type="text"
                className="custom-modal__input custom-modal__input--readonly"
                placeholder={t('modal.fields.area.placeholder')}
                value={formData.area}
                readOnly
                disabled
              />
            </label>
          </div>

          {/* Row 3: Inspektor FIO - full width */}
          <div className="custom-modal__row custom-modal__row--full">
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.inspector.label')}</span>
              <input
                type="text"
                className="custom-modal__input"
                placeholder={t('modal.fields.inspector.placeholder')}
                value={formData.inspector}
                onChange={(e) => handleChange('inspector', e.target.value)}
              />
            </label>
          </div>

          {/* Row 4: Hisoblangan zarar + Qo'llanilgan jarima */}
          <div className="custom-modal__row custom-modal__row--half">
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.damage.label')}</span>
              <input
                type="text"
                className="custom-modal__input"
                placeholder={t('modal.fields.damage.placeholder')}
                value={formData.damage}
                onChange={(e) => handleChange('damage', e.target.value)}
              />
            </label>
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.fine.label')}</span>
              <input
                type="text"
                className="custom-modal__input"
                placeholder={t('modal.fields.fine.placeholder')}
                value={formData.fine}
                onChange={(e) => handleChange('fine', e.target.value)}
              />
            </label>
          </div>

          {/* Row 5: Izoh (wider) + Tekshiruv natijasi (narrower dropdown) */}
          <div className="custom-modal__row custom-modal__row--izoh">
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.note.label')}</span>
              <input
                type="text"
                className="custom-modal__input"
                placeholder={t('modal.fields.note.placeholder')}
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
              />
            </label>
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.result.label')}</span>
              <CustomDropdown
                value={formData.result}
                options={resultOptions}
                onChange={(value) => handleChange('result', value)}
              />
            </label>
          </div>

          {/* File upload zone */}
          <div className="custom-modal__row custom-modal__row--full">
            <label className="custom-modal__field">
              <span className="custom-modal__label">{t('modal.fields.fileUpload.label')}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.shp"
                onChange={handleFileInputChange}
                className="custom-modal__file-input"
                style={{ display: 'none' }}
              />
              <div
                className={`custom-modal__upload-zone ${isDragging ? 'custom-modal__upload-zone--dragging' : ''} ${uploadedFile ? 'custom-modal__upload-zone--has-file' : ''}`}
                onClick={handleUploadClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {uploadedFile ? (
                  <>
                    <div className="custom-modal__file-info">
                      <svg
                        className="custom-modal__file-icon"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 2V8H20"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="custom-modal__file-details">
                        <div className="custom-modal__file-name">{uploadedFile.name}</div>
                        <div className="custom-modal__file-size">{formatFileSize(uploadedFile.size)}</div>
                      </div>
                      <button
                        type="button"
                        className="custom-modal__file-remove"
                        onClick={handleRemoveFile}
                        aria-label={t('modal.fields.fileUpload.remove')}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 4L4 12M4 4L12 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <UploadIcon />
                    <div className="custom-modal__upload-text">
                      {t('modal.fields.fileUpload.text')} <span>{t('modal.fields.fileUpload.textSpan')}</span>
                    </div>
                    <div className="custom-modal__upload-hint">
                      {t('modal.fields.fileUpload.hint')}
                    </div>
                  </>
                )}
              </div>
              {uploadError && (
                <div className="custom-modal__upload-error">
                  {uploadError}
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="custom-modal__footer">
          <button type="button" className="custom-modal__cancel" onClick={onClose}>
            {t('modal.buttons.cancel')}
          </button>
          <button type="button" className="custom-modal__submit" onClick={handleSubmit}>
            {t('modal.buttons.submit')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, portalContainer);
};

export default memo(CustomModal);