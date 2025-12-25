/** @jsx jsx */
import {
  React,
  jsx
} from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import {
  SettingSection,
  SettingRow,
  LinkSelector,
  type IMLinkParam
} from "jimu-ui/advanced/setting-components";
import {
  Label,
  Input,
  NumericInput,
  Switch
} from "jimu-ui";
import { IMConfig } from "../config";

const Setting = (props: AllWidgetSettingProps<IMConfig>) => {
  const { config, id, onSettingChange } = props;

  const handleConfigChange = (key: string, value: any) => {
    onSettingChange({
      id,
      config: {
        ...config,
        [key]: value
      }
    });
  };

  return (
    <div className="widget-setting-monitoring-results">
      <SettingSection title="API Configuration">
        <SettingRow label="API Base URL">
          <Input
            type="text"
            placeholder="Enter API base URL"
            value={config.apiBaseUrl || ""}
            onChange={(e) => handleConfigChange("apiBaseUrl", e.target.value)}
          />
        </SettingRow>
        <SettingRow label="API Token">
          <Input
            type="password"
            placeholder="Enter JWT token"
            value={config.apiToken || ""}
            onChange={(e) => handleConfigChange("apiToken", e.target.value)}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Table Settings">
        <SettingRow label="Enable Pagination">
          <Switch
            checked={config.enablePagination !== false}
            onChange={(e) => handleConfigChange("enablePagination", e.target.checked)}
          />
        </SettingRow>
        <SettingRow label="Items Per Page">
          <NumericInput
            min={1}
            max={100}
            value={config.itemsPerPage || 20}
            onChange={(value) => handleConfigChange("itemsPerPage", value)}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Navigation Settings">
        <SettingRow role="group" aria-label="Set link">
          <LinkSelector
            onSettingConfirm={(linkParam: IMLinkParam) => {
              handleConfigChange("linkParam", linkParam);
            }}
            linkParam={config.linkParam}
            widgetId={id}
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
};

export default Setting;

