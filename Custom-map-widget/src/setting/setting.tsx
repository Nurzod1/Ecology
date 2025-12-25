/** @jsx jsx */
import { jsx } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { IMConfig } from '../config';

const Setting = (props: AllWidgetSettingProps<IMConfig>) => {
  return (
    <div className="widget-setting-custom-map" style={{ padding: '20px' }}>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>
          Custom Map Widget
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
          This widget displays a map of Uzbekistan.
        </p>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '4px',
          fontSize: '13px',
          color: '#1976d2'
        }}>
          ℹ️ No configuration required. The widget displays a map of Uzbekistan automatically.
        </div>
      </div>
    </div>
  );
};

export default Setting;
