/** @jsx jsx */
import { AllWidgetProps, jsx } from 'jimu-core';
import { IMConfig } from '../config';
import ObjectGeoInfo from './components/object-info/ObjectGeoInfo';

import './style.css';

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const { id, context } = props;

  return (
    <div className="custom-map-widget" data-widget-id={id}>
      <ObjectGeoInfo assetBasePath={context?.folderUrl} />
    </div>
  );
};

export default Widget;
