export interface MonitoringResultItem {
  id: string;
  uzcosmos: {
    status: 'pending' | 'in-progress' | 'completed';
    progress: number; // Always 100
  };
  ekologiya: {
    status: 'pending' | 'warning' | 'caution' | 'completed'; // For color determination
    value: boolean | null; // true = 100%, false = 0%, null = null (for progress logic and color)
  };
  prokuratura: {
    status: 'pending' | 'completed';
    progress: number; // 0-100
  };
}

export type StatusColor = 'light-blue' | 'red' | 'yellow' | 'gray';

