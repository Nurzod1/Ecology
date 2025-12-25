/** @jsx jsx */
import { React, jsx } from "jimu-core";
import ReactECharts from "echarts-for-react";
import { useRef, useEffect, useState, useMemo } from "react";

interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

interface CategoryChartProps {
  data: CategoryData[];
  title?: string;
  onTypeClick?: (index: number) => void;
}

const CategoryChart: React.FC<CategoryChartProps> = ({ data, title = "Toifa kesimida ma'lumot", onTypeClick }) => {
  const legendRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [scrollbarHeight, setScrollbarHeight] = useState(260);
  const [scrollbarTop, setScrollbarTop] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Цвета для диаграммы - группируем по категориям
  const colorGroups = [
    // Светло-голубые оттенки
    ["#3BADB0", "#4DD5E8", "#7EF0F3", "#5BC8D0"],
    // Темно-синие оттенки
    ["#0F4A6B", "#1A5F7A", "#0D3D5A", "#256B8A"],
    // Синие оттенки
    ["#2D8AB9", "#3A9BC5", "#1E6A8F", "#4AB0D5"],
    // Фиолетовые оттенки
    ["#7E468A", "#8D5A9A", "#6B3A75", "#9A6BA5"],
    // Пурпурные оттенки
    ["#942270", "#A83A85", "#7A1A5A", "#B54A95"],
    // Розовые оттенки
    ["#C12862", "#D1457A", "#A81A4F", "#E15A8A"],
    // Зеленые оттенки
    ["#2ECC71", "#27AE60", "#1E8449", "#52BE80"],
    // Бирюзовые/циановые оттенки
    ["#1ABC9C", "#16A085", "#138D75", "#48C9B0"],
    // Оранжевые оттенки
    ["#E67E22", "#D35400", "#BA4A00", "#EB984E"],
    // Коралловые оттенки
    ["#FF6B6B", "#EE5A6F", "#DC4A5A", "#FF8E8E"],
    // Желтые оттенки
    ["#F39C12", "#D68910", "#B9770E", "#F7DC6F"],
    // Изумрудные оттенки
    ["#10A881", "#0E8F6F", "#0C765D", "#2EBD9F"],
    // Серые оттенки
    ["#BDC3C7", "#95A5A6", "#7F8C8D", "#626D70"],
    // Коричневые оттенки
    ["#8E6E53", "#7B5A3C", "#6A4A2F", "#A68B6A"],
    // Лайм/салатовые оттенки
    ["#9CCC65", "#7CB342", "#558B2F", "#AED581"],
    // Красные оттенки
    ["#E74C3C", "#C0392B", "#992D22", "#F1948A"],
    // Темно-синие/индиго оттенки
    ["#34495E", "#2C3E50", "#22313F", "#3E5C76"],
  ];

  // Перемешиваем цвета: берем по одному из каждой группы по кругу
  const mixedColors: string[] = [];
  const maxGroupLength = Math.max(...colorGroups.map(group => group.length));
  
  for (let i = 0; i < maxGroupLength; i++) {
    colorGroups.forEach(group => {
      if (i < group.length) {
        mixedColors.push(group[i]);
      }
    });
  }

  const getColorForIndex = (index: number) => {
    return mixedColors[index % mixedColors.length];
  };

  // Подготовка данных для ECharts с индивидуальными цветами для каждого сегмента
  const chartData = data
    .filter((item) => item.value > 0) // Фильтруем элементы с нулевым значением
    .map((item, index) => {
      return {
        name: item.name,
        value: item.value,
        itemStyle: {
          color: getColorForIndex(index),
          borderColor: 'rgba(16, 28, 50, 0.3)', // Цвет фона виджета для создания отступа
          borderWidth: 2, // Ширина границы для визуального отступа
        },
      };
    });
  
  // Выводим данные для чарта в консоль для отладки
  console.log("Исходные данные (data):", data);
  console.log("Данные для чарта (chartData):", chartData);
  console.log("Всего элементов в chartData:", chartData.length);
  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  console.log("Общая сумма значений:", totalValue);
  
  // Проверяем наличие сегмента со значением 1
  const smallSegment = chartData.find(item => item.value === 1);
  if (smallSegment) {
    console.log("НАЙДЕН сегмент со значением 1:", smallSegment);
  } else {
    console.warn("НЕ НАЙДЕН сегмент со значением 1 в chartData!");
  }
  
  chartData.forEach((item, index) => {
    const percentage = ((item.value / totalValue) * 100).toFixed(2);
    const angle = (item.value / totalValue) * 360;
    console.log(`Элемент ${index}: ${item.name}, value: ${item.value}, процент: ${percentage}%, угол: ${angle.toFixed(2)}°, color: ${item.itemStyle.color}`);
  });

  // Обработка клика на сегмент чарта
  const handleChartClick = (params: any) => {
    if (params && params.dataIndex !== undefined) {
      // Находим исходный индекс в массиве data (с учетом фильтрации)
      const chartDataIndex = params.dataIndex;
      let originalIndex = -1;
      let count = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i].value > 0) {
          if (count === chartDataIndex) {
            originalIndex = i;
            break;
          }
          count++;
        }
      }
      if (originalIndex !== -1) {
        setSelectedIndex(originalIndex === selectedIndex ? null : originalIndex);
        // Прокручиваем к элементу легенды
        scrollToLegendItem(originalIndex);
        // Вызываем обработчик клика для сохранения в localStorage
        if (onTypeClick) {
          onTypeClick(originalIndex);
        }
      }
    }
  };

  // Обработка клика на элемент легенды
  const handleLegendClick = (index: number) => {
    if (data[index].value > 0) {
      setSelectedIndex(index === selectedIndex ? null : index);
      // Вызываем обработчик клика для сохранения в localStorage
      if (onTypeClick) {
        onTypeClick(index);
      }
    }
  };

  // Обработка наведения для позиционирования tooltip
  const handleLegendMouseEnter = (e: React.MouseEvent<HTMLDivElement>, text: string) => {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    // Предполагаемый размер tooltip
    const tooltipWidth = 300;
    const tooltipHeight = 60;

    // Вычисляем позицию tooltip относительно viewport
    let left = rect.left + rect.width / 2;
    let top = rect.top - tooltipHeight - 12;

    // Проверяем, не выходит ли tooltip за границы экрана
    if (left - tooltipWidth / 2 < 10) {
      left = tooltipWidth / 2 + 10;
    } else if (left + tooltipWidth / 2 > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth / 2 - 10;
    }

    if (top < 10) {
      top = rect.bottom + 12;
    }

    setTooltip({ text, x: left, y: top });
  };

  // Обработка ухода мыши
  const handleLegendMouseLeave = () => {
    setTooltip(null);
  };

  // Прокрутка к элементу легенды
  const scrollToLegendItem = (index: number) => {
    if (legendRef.current) {
      const items = legendRef.current.children;
      if (items[index]) {
        const item = items[index] as HTMLElement;
        const container = legendRef.current;
        const itemTop = item.offsetTop;
        const itemHeight = item.offsetHeight;
        const containerHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // Если элемент выше видимой области
        if (itemTop < scrollTop) {
          container.scrollTo({
            top: itemTop - 8,
            behavior: 'smooth'
          });
        }
        // Если элемент ниже видимой области
        else if (itemTop + itemHeight > scrollTop + containerHeight) {
          container.scrollTo({
            top: itemTop + itemHeight - containerHeight + 8,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  // Эффект для синхронизации выделения в чарте при изменении selectedIndex
  useEffect(() => {
    if (chartRef.current) {
      const chartInstance = chartRef.current.getEchartsInstance();
      if (chartInstance) {
        // Убираем выделение со всех сегментов
        chartInstance.dispatchAction({
          type: 'downplay',
          dataIndex: 'all'
        });
        
        // Выделяем выбранный сегмент
        if (selectedIndex !== null && data[selectedIndex]?.value > 0) {
          // Находим индекс в chartData
          let chartDataIndex = -1;
          let count = 0;
          for (let i = 0; i <= selectedIndex; i++) {
            if (data[i].value > 0) {
              if (i === selectedIndex) {
                chartDataIndex = count;
                break;
              }
              count++;
            }
          }
          
          if (chartDataIndex >= 0) {
            chartInstance.dispatchAction({
              type: 'highlight',
              dataIndex: chartDataIndex
            });
          }
        }
      }
    }
  }, [selectedIndex, data]);

  // Обработка скролла легенды
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // Обновляем позицию скроллбара
    if (maxScroll > 0 && scrollbarHeight > 0 && scrollbarRef.current) {
      // Получаем реальную высоту контейнера скроллбара
      const scrollbarContainerHeight = scrollbarRef.current.clientHeight;
      // Максимальная позиция для скроллбара (с учетом отступа сверху 2px из стилей)
      const scrollbarMaxTop = Math.max(0, scrollbarContainerHeight - scrollbarHeight - 2);
      // Процент прокрутки (от 0 до 1)
      const scrollPercent = Math.min(1, Math.max(0, scrollTop / maxScroll));
      // Новая позиция ползунка
      const newTop = scrollPercent * scrollbarMaxTop;
      setScrollbarTop(newTop);
    } else {
      setScrollbarTop(0);
    }
  };

  // Настройка ECharts для donut диаграммы с закругленными углами
  const option = useMemo(() => ({
    backgroundColor: "transparent",
    // Улучшаем качество рендеринга
    animation: true,
    animationDuration: 0,
    animationDurationUpdate: 600,
    animationEasingUpdate: 'cubicOut',
    tooltip: false,
    series: [
      {
        type: "pie",
        radius: ["42%", "72%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        tooltip: {
          show: false,
        },
        animation: true,
        animationType: 'scale',
        animationDuration: 0,
        animationEasing: 'cubicOut',
        animationDurationUpdate: 600,
        animationEasingUpdate: 'cubicOut',
        animationThreshold: 2000,
        // Промежуток между сегментами
        padAngle: 0, // Угол промежутка в градусах (отступ создается через border)
        minAngle: 0, // Минимальный угол для отображения сегмента (0 = показывать все)
        stillShowZeroSum: false, // Не показывать нулевые значения
        minShowLabelAngle: 0, // Минимальный угол для показа метки (0 = показывать все)
        // Закругленные углы для всех сегментов
        itemStyle: {
          borderRadius: 8, // Радиус закругления углов (применяется ко всем углам)
          // Бордер убран по требованию
        },
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          label: {
            show: false,
          },
          itemStyle: {
            // shadowBlur: 20,
            shadowOffsetX: 0,
            shadowColor: 'rgba(255, 255, 255, 0.5)',
          },
          scale: true,
          scaleSize: 5,
          focus: 'none',
          blurScope: 'none',
        },
        blur: {
          itemStyle: {
            opacity: 1,
          },
        },
        data: chartData,
      },
    ],
  }), [chartData]);

  // Вычисляем высоту скроллбара на основе количества элементов
  useEffect(() => {
    const updateScrollbar = () => {
      if (legendRef.current && scrollbarRef.current) {
        const container = legendRef.current;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const scrollbarContainerHeight = scrollbarRef.current.clientHeight;

        if (scrollHeight > clientHeight) {
          // Высота скроллбара пропорциональна видимой области
          const ratio = clientHeight / scrollHeight;
          const calculatedHeight = Math.max(40, scrollbarContainerHeight * ratio);
          setScrollbarHeight(calculatedHeight);
          
          // Обновляем позицию при изменении высоты
          const scrollTop = container.scrollTop;
          const maxScroll = scrollHeight - clientHeight;
          if (maxScroll > 0) {
            const scrollbarMaxTop = Math.max(0, scrollbarContainerHeight - calculatedHeight - 2);
            const scrollPercent = Math.min(1, Math.max(0, scrollTop / maxScroll));
            setScrollbarTop(scrollPercent * scrollbarMaxTop);
          }
        } else {
          // Если контент помещается, скроллбар на всю высоту
          setScrollbarHeight(scrollbarContainerHeight);
          setScrollbarTop(0);
        }
      }
    };

    updateScrollbar();
    
    // Обновляем при изменении размера окна
    window.addEventListener('resize', updateScrollbar);
    return () => window.removeEventListener('resize', updateScrollbar);
  }, [data]);

  // Скрываем tooltip после инициализации чарта и проверяем отображение сегментов
  useEffect(() => {
    if (chartRef.current) {
      const chartInstance = chartRef.current.getEchartsInstance();
      if (chartInstance) {
        // Скрываем tooltip
        chartInstance.dispatchAction({
          type: 'hideTip'
        });
        
        // Также скрываем через DOM
        const tooltipElements = document.querySelectorAll('.echarts-tooltip');
        tooltipElements.forEach((el: any) => {
          if (el) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
          }
        });
        
        // Проверяем, сколько сегментов отображается в чарте
        setTimeout(() => {
          try {
            const option = chartInstance.getOption();
            const seriesData = option.series?.[0]?.data;
            console.log("Данные в отрендеренном чарте:", seriesData);
            console.log("Количество сегментов в чарте:", seriesData?.length || 0);
            
            // Проверяем наличие сегмента со значением 1
            const smallSegmentInChart = seriesData?.find((item: any) => item.value === 1);
            if (smallSegmentInChart) {
              console.log("Сегмент со значением 1 найден в отрендеренном чарте:", smallSegmentInChart);
            } else {
              console.warn("Сегмент со значением 1 НЕ найден в отрендеренном чарте!");
            }
          } catch (error) {
            console.error("Ошибка при проверке данных чарта:", error);
          }
        }, 500);
      }
    }
  }, [option]);

  // Эффект для синхронизации выделения в чарте при изменении selectedIndex
  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) {
      return;
    }

    const chartInstance = chartRef.current?.getEchartsInstance();
    if (!chartInstance) {
      return;
    }

    // Убираем выделение со всех сегментов
    chartInstance.dispatchAction({
      type: 'downplay',
      seriesIndex: 0,
      dataIndex: 'all'
    });

    // Выделяем выбранный сегмент с плавной анимацией
    if (selectedIndex !== null && data[selectedIndex]?.value > 0) {
      // Находим индекс в chartData
      let chartDataIndex = -1;
      let count = 0;
      for (let i = 0; i <= selectedIndex; i++) {
        if (data[i] && data[i].value > 0) {
          if (i === selectedIndex) {
            chartDataIndex = count;
            break;
          }
          count++;
        }
      }
      
      if (chartDataIndex >= 0) {
        // Используем dispatchAction с задержкой для плавной анимации выделения
        setTimeout(() => {
          chartInstance.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataIndex: chartDataIndex
          });
        }, 50);
      }
    }
  }, [selectedIndex, data, chartData]);

  return (
    <div className="category-chart">
      <div className="category-chart__title">{title}</div>
      
      <div className="category-chart__content">
        {/* Donut диаграмма */}
        <div className="category-chart__donut">
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ width: "100%", height: "100%", top: "-25px"}}
            notMerge={true}
            lazyUpdate={false}
            opts={{
              renderer: "svg", // Используем SVG для четкости
              devicePixelRatio: 2, // Увеличиваем разрешение для четкости
            }}
            onEvents={{
              click: handleChartClick,
              mouseover: () => {
                // Предотвращаем показ tooltip
                if (chartRef.current) {
                  const chartInstance = chartRef.current.getEchartsInstance();
                  if (chartInstance) {
                    chartInstance.dispatchAction({
                      type: 'hideTip'
                    });
                  }
                }
              },
            }}
          />
        </div>

        {/* Легенда со скроллом */}
        <div className="category-chart__legend-wrapper">
          <div
            ref={legendRef}
            className="category-chart__legend"
            onScroll={handleScroll}
          >
            {data.map((item, index) => {
              const isSelected = selectedIndex === index;
              const hasValue = item.value > 0;
              
              return (
                <div
                  key={index}
                  className={`category-chart__legend-item ${
                    isSelected ? "category-chart__legend-item--active" : ""
                  }`}
                  onClick={() => handleLegendClick(index)}
                  onMouseEnter={(e) => handleLegendMouseEnter(e, item.name)}
                  onMouseLeave={handleLegendMouseLeave}
                  style={{ cursor: hasValue ? 'pointer' : 'default' }}
                >
                  <div className="category-chart__legend-text">{item.name}</div>
                  {hasValue && (
                    <div
                      className="category-chart__legend-badge"
                      style={{
                        background: getColorForIndex(index),
                      }}
                    >
                      {item.value.toLocaleString("ru-RU")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Скроллбар */}
          {/* <div ref={scrollbarRef} className="category-chart__scrollbar">
            <div
              className="category-chart__scrollbar-thumb"
              style={{
                height: `${scrollbarHeight}px`,
                top: `${2 + scrollbarTop}px`, // 2px базовый отступ + позиция скролла
              }}
            />
          </div> */}
        </div>
      </div>

      {/* Кастомный tooltip */}
      {tooltip && (
        <div
          className="category-chart__tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}

    </div>
  );
};

export default CategoryChart;

