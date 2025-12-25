/** @jsx jsx */
import { React, jsx } from "jimu-core";
import "../styles/StatusIndicator.css";

interface StatusIndicatorProps {
  uzcosmosStatus: 'pending' | 'completed' | 'in-progress';
  uzcosmosProgress: number; // Always 100
  ekologiyaStatus: 'pending' | 'warning' | 'caution' | 'completed'; // For color determination
  ekologiya: boolean | null; // true = 100%, false = 0%, null = null (for progress logic and color)
  prokraturaStatus: 'pending' | 'completed';
  prokraturaProgress: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  uzcosmosStatus,
  uzcosmosProgress,
  ekologiyaStatus,
  ekologiya,
  prokraturaStatus,
  prokraturaProgress
}) => {
  const getUzcosmosColor = () => {
    return '#28BEC1'; // cyan/turquoise
  };

  const getEkologiyaColor = () => {
    // Color based on actual value: true = #28BEC1, false = #C12862, null = #517492
    if (ekologiya === true) {
      return '#28BEC1'; // cyan/turquoise
    } else if (ekologiya === false) {
      return '#C12862'; // pink/red
    } else {
      return '#517492'; // blue/gray (null)
    }
  };

  const getProkraturaColor = () => {
    switch (prokraturaStatus) {
      case 'completed':
        return '#7aa8e0'; // gray-blue
      default:
        return '#7aa8e0'; // gray-blue
    }
  };

  const getEkologiyaAnimationClass = () => {
    // Animation class based on value: true = cyan, false = red, null = blue-gray
    if (ekologiya === true) {
      return 'animate-cyan';
    } else if (ekologiya === false) {
      return 'animate-red';
    } else {
      return 'animate-blue-gray';
    }
  };

  // Fixed positions: UZCOSMOS at 0%, EKOLOGIYA at 50%, PROKRATURA at 100%
  const uzcosmosPosition = 0;
  const ekologiyaPosition = 50;
  const prokraturaPosition = 100;

  // Logic:
  // - If ekologiya is null: go halfway to ekologiya (25%)
  // - If ekologiya is false: stop at ekologiya (50%)
  // - If ekologiya is true: go halfway to prokuratura (75%)
  const totalProgress = 
    ekologiya === null 
      ? uzcosmosPosition + (ekologiyaPosition - uzcosmosPosition) * 0.5 // Halfway to ekologiya (25%)
      : ekologiyaPosition + (prokraturaPosition - ekologiyaPosition) * (ekologiya === true ? 0.5 : 0);

  return (
    <div className="status-indicator-container">
      <div className="status-indicator-track">
        {/* Background line for first segment */}
        <div 
          className="status-indicator-line-background first-segment-bg"
          style={{
            left: `${uzcosmosPosition}%`,
            width: `${ekologiyaPosition - uzcosmosPosition}%`
          }}
        />
        
        {/* Animated progress line: single continuous flow from UZCOSMOS forward */}
        <div 
          className="status-indicator-line animated"
          style={{
            left: `${uzcosmosPosition}%`,
            width: `${totalProgress}%`
          }}
        />
        
        {/* Background line for second segment */}
        <div 
          className="status-indicator-line-background second-segment-bg"
          style={{
            left: `${ekologiyaPosition}%`,
            width: `${prokraturaPosition - ekologiyaPosition}%`
          }}
        />
        
        {/* UZCOSMOS circle (first dot) - Always animating */}
        <div 
          className="status-indicator-circle uzcosmos"
          style={{ 
            left: `${uzcosmosPosition}%`,
            backgroundColor: getUzcosmosColor()
          }}
        />
        
        {/* EKOLOGIYA circle (second dot) - Animation based on status */}
        <div 
          className={`status-indicator-circle ekologiya ${getEkologiyaAnimationClass()}`}
          style={{ 
            left: `${ekologiyaPosition}%`,
            backgroundColor: getEkologiyaColor()
          }}
        />
        
        {/* PROKRATURA circle (third dot) - Always animating */}
        <div 
          className="status-indicator-circle prokratura"
          style={{ 
            left: `${prokraturaPosition}%`,
            backgroundColor: getProkraturaColor(),
            border: '2px solid #2d3e5f'
          }}
        >
          <div className="status-indicator-inner-circle" />
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;