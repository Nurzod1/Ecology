/** @jsx jsx */
import { React, jsx } from "jimu-core";
import { MonitoringResultItem } from "../types/monitoringTypes";
import StatusIndicator from "./StatusIndicator";
import { translations } from "../translations";
import "../styles/MonitoringResultsTable.css";

// Normalize locale from storage format (uz-Latn, uz-Cyrl, ru) to internal format
const normalizeLocale = (locale: string | null): "uz" | "uzcryl" | "ru" => {
  if (!locale) return "ru";
  if (locale === "uz-Latn") return "uz";
  if (locale === "uz-Cyrl") return "uzcryl";
  if (locale === "uz" || locale === "uzcryl" || locale === "ru") return locale;
  return "ru";
};

interface MonitoringResultsTableProps {
  data: MonitoringResultItem[];
  loading: boolean;
  error: string | null;
  selectedRowId?: string;
  onRowClick?: (item: MonitoringResultItem) => void;
}

const MonitoringResultsTable: React.FC<MonitoringResultsTableProps> = ({
  data,
  loading,
  error,
  selectedRowId,
  onRowClick
}) => {
  const [locale, setLocale] = React.useState<"uz" | "uzcryl" | "ru">(() => {
    try {
      const stored = localStorage.getItem("customLocal");
      return normalizeLocale(stored);
    } catch {
      return "ru";
    }
  });
  const t = translations[locale] || translations.ru;

  const tbodyContainerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollbarRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollbarHeight, setScrollbarHeight] = React.useState<number>(40);
  const [scrollbarTop, setScrollbarTop] = React.useState<number>(0);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [showBottomFade, setShowBottomFade] = React.useState<boolean>(false);
  const dragStartY = React.useRef<number>(0);
  const dragStartScrollTop = React.useRef<number>(0);

  // Listen for locale changes in localStorage
  React.useEffect(() => {
    const checkLocale = () => {
      try {
        const stored = localStorage.getItem("customLocal");
        const newLocale = normalizeLocale(stored);
        setLocale(prevLocale => {
          if (newLocale !== prevLocale) {
            return newLocale;
          }
          return prevLocale;
        });
      } catch (err) {
        // Ignore locale lookup errors
      }
    };

    // Check on mount
    checkLocale();

    // Listen for storage events (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "customLocal" || e.key === null) {
        checkLocale();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll for changes in same tab
    const interval = setInterval(checkLocale, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    if (!selectedRowId || !tbodyContainerRef.current) {
      return;
    }

    const row = tbodyContainerRef.current.querySelector(
      `tr[data-row-id="${selectedRowId}"]`
    );

    if (row instanceof HTMLElement) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [selectedRowId, data]);

  // Sync custom scrollbar size/position with tbody scroll
  React.useEffect(() => {
    const updateScrollbar = () => {
      if (!tbodyContainerRef.current || !scrollbarRef.current) {
        return;
      }

      const container = tbodyContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollbarContainerHeight = scrollbarRef.current.clientHeight;

      if (scrollHeight > clientHeight) {
        const ratio = clientHeight / scrollHeight;
        const calculatedHeight = Math.max(40, scrollbarContainerHeight * ratio);
        setScrollbarHeight(calculatedHeight);

        const scrollTop = container.scrollTop;
        const maxScroll = scrollHeight - clientHeight;
        
        // Update bottom fade visibility
        const isNearBottom = maxScroll > 0 && scrollTop < maxScroll - 10;
        setShowBottomFade(isNearBottom);
        
        if (maxScroll > 0) {
          const scrollbarMaxTop = Math.max(0, scrollbarContainerHeight - calculatedHeight);
          const scrollPercent = Math.min(1, Math.max(0, scrollTop / maxScroll));
          setScrollbarTop(scrollPercent * scrollbarMaxTop);
        }
      } else {
        setScrollbarHeight(scrollbarContainerHeight);
        setScrollbarTop(0);
        setShowBottomFade(false);
      }
    };

    updateScrollbar();

    window.addEventListener("resize", updateScrollbar);
    return () => window.removeEventListener("resize", updateScrollbar);
  }, [data]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isDragging) return;
    
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // Check if we're near the bottom (within 10px threshold)
    const isNearBottom = maxScroll > 0 && scrollTop < maxScroll - 10;
    setShowBottomFade(isNearBottom);

    if (maxScroll > 0 && scrollbarRef.current) {
      const scrollbarContainerHeight = scrollbarRef.current.clientHeight;
      const scrollbarMaxTop = Math.max(0, scrollbarContainerHeight - scrollbarHeight);
      const scrollPercent = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setScrollbarTop(scrollPercent * scrollbarMaxTop);
    } else {
      setScrollbarTop(0);
    }
  };

  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    if (tbodyContainerRef.current) {
      dragStartScrollTop.current = tbodyContainerRef.current.scrollTop;
    }
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!tbodyContainerRef.current || !scrollbarRef.current) return;

      const container = tbodyContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      
      if (maxScroll <= 0) return;

      const scrollbarContainerHeight = scrollbarRef.current.clientHeight;
      const scrollbarMaxTop = Math.max(0, scrollbarContainerHeight - scrollbarHeight);
      
      const deltaY = e.clientY - dragStartY.current;
      const scrollbarRatio = deltaY / scrollbarContainerHeight;
      const newScrollTop = Math.max(0, Math.min(maxScroll, dragStartScrollTop.current + (scrollbarRatio * maxScroll)));
      
      container.scrollTop = newScrollTop;
      
      const scrollPercent = Math.min(1, Math.max(0, newScrollTop / maxScroll));
      setScrollbarTop(scrollPercent * scrollbarMaxTop);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, scrollbarHeight]);

  if (error) {
    return (
      <div className="monitoring-results-error">
        <p>{t.error}: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="monitoring-results-loading">
        <p>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="monitoring-results-table-wrapper">
      <table className="monitoring-results-table">
        <thead>
          <tr>
            <th className="monitoring-results-header-id">{t.idColumn}</th>
            <th className="monitoring-results-header-status" colSpan={3}>
              <div className="monitoring-results-header-columns">
                <span className="monitoring-results-column-label">{t.uzcosmos}</span>
                <span className="monitoring-results-column-label">{t.ekologiya}</span>
                <span className="monitoring-results-column-label">{t.prokuratura}</span>
              </div>
            </th>
          </tr>
        </thead>
      </table>

      <div
        className="monitoring-results-tbody-container"
        ref={tbodyContainerRef}
        onScroll={handleScroll}
      >
        <table className="monitoring-results-table">
          <colgroup>
            <col className="monitoring-results-col-id" />
            <col className="monitoring-results-col-status" />
          </colgroup>
          <tbody className="monitoring-results-table-body">
            {data.map((item) => {
              const isSelected = selectedRowId === item.id;
              return (
                <tr
                  key={item.id}
                  className={`monitoring-results-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => onRowClick && onRowClick(item)}
                  data-row-id={item.id}
                >
                  <td className="monitoring-results-id">
                    {item.id}
                  </td>
                  <td className="monitoring-results-status-cell" colSpan={3}>
                    <StatusIndicator
                      uzcosmosStatus={item.uzcosmos.status}
                      uzcosmosProgress={item.uzcosmos.progress}
                      ekologiyaStatus={item.ekologiya.status}
                      ekologiya={item.ekologiya.value}
                      prokraturaStatus={item.prokuratura.status}
                      prokraturaProgress={item.prokuratura.progress}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div ref={scrollbarRef} className="monitoring-results-scrollbar">
        <div
          className="monitoring-results-scrollbar-thumb"
          style={{ height: `${scrollbarHeight}px`, top: `${scrollbarTop}px` }}
          onMouseDown={handleThumbMouseDown}
        />
      </div>
      
      {showBottomFade && (
        <div className="monitoring-results-bottom-fade" />
      )}
    </div>
  );
};

export default MonitoringResultsTable;