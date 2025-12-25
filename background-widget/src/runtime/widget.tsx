/** @jsx jsx */
import {
  React,
  jsx,
  type AllWidgetProps
} from "jimu-core";
import { useState, useEffect } from "react";
import "./styles/widget.css";

// Функция для преобразования hex в rgba
const hexToRgba = (hex: string, alpha: number = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface IMConfig {}

interface ThemeGradients {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  circle1: string;
  circle2: string;
  circle3: string;
  circle4: string;
  circle5: string;
  circle6: string;
  circle7: string;
  circle8: string;
}

// Конфигурация градиентов для каждого цвета
const getThemeGradients = (themeColor: string): ThemeGradients => {
  const gradients: Record<string, ThemeGradients> = {
    "#19253b": {
      primary: "#0a0f1a",
      secondary: "#19253b",
      tertiary: "#1a2a3f",
      accent: "#0d1520",
      circle1: hexToRgba("#3b82f6", 0.3),
      circle2: hexToRgba("#60a5fa", 0.25),
      circle3: hexToRgba("#93c5fd", 0.2),
      circle4: hexToRgba("#1e40af", 0.25),
      circle5: hexToRgba("#3b82f6", 0.22),
      circle6: hexToRgba("#60a5fa", 0.18),
      circle7: hexToRgba("#93c5fd", 0.15),
      circle8: hexToRgba("#1e40af", 0.2),
    },
    "#0b6baa": {
      primary: "#0a0f1a",
      secondary: "#19253b",
      tertiary: "#1a2a3f",
      accent: "#0d1520",
      circle1: hexToRgba("#0ea5e9", 0.3),
      circle2: hexToRgba("#38bdf8", 0.25),
      circle3: hexToRgba("#7dd3fc", 0.2),
      circle4: hexToRgba("#0284c7", 0.25),
      circle5: hexToRgba("#0ea5e9", 0.22),
      circle6: hexToRgba("#38bdf8", 0.18),
      circle7: hexToRgba("#7dd3fc", 0.15),
      circle8: hexToRgba("#0284c7", 0.2),
    },
    "#00888d": {
      primary: "#0a0f1a",
      secondary: "#19253b",
      tertiary: "#1a2a3f",
      accent: "#0d1520",
      circle1: hexToRgba("#14b8a6", 0.3),
      circle2: hexToRgba("#2dd4bf", 0.25),
      circle3: hexToRgba("#5eead4", 0.2),
      circle4: hexToRgba("#0d9488", 0.25),
      circle5: hexToRgba("#14b8a6", 0.22),
      circle6: hexToRgba("#2dd4bf", 0.18),
      circle7: hexToRgba("#5eead4", 0.15),
      circle8: hexToRgba("#0d9488", 0.2),
    },
    "#793b05": {
      primary: "#0a0f1a",
      secondary: "#19253b",
      tertiary: "#1a2a3f",
      accent: "#0d1520",
      circle1: hexToRgba("#f59e0b", 0.3),
      circle2: hexToRgba("#fbbf24", 0.25),
      circle3: hexToRgba("#fcd34d", 0.2),
      circle4: hexToRgba("#d97706", 0.25),
      circle5: hexToRgba("#f59e0b", 0.22),
      circle6: hexToRgba("#fbbf24", 0.18),
      circle7: hexToRgba("#fcd34d", 0.15),
      circle8: hexToRgba("#d97706", 0.2),
    },
    "#a0202c": {
      primary: "#0a0f1a",
      secondary: "#19253b",
      tertiary: "#1a2a3f",
      accent: "#0d1520",
      circle1: hexToRgba("#ef4444", 0.3),
      circle2: hexToRgba("#f87171", 0.25),
      circle3: hexToRgba("#fca5a5", 0.2),
      circle4: hexToRgba("#dc2626", 0.25),
      circle5: hexToRgba("#ef4444", 0.22),
      circle6: hexToRgba("#f87171", 0.18),
      circle7: hexToRgba("#fca5a5", 0.15),
      circle8: hexToRgba("#dc2626", 0.2),
    },
    "#63289e": {
      primary: "#0a0f1a",
      secondary: "#19253b",
      tertiary: "#1a2a3f",
      accent: "#0d1520",
      circle1: hexToRgba("#a855f7", 0.3),
      circle2: hexToRgba("#c084fc", 0.25),
      circle3: hexToRgba("#d8b4fe", 0.2),
      circle4: hexToRgba("#9333ea", 0.25),
      circle5: hexToRgba("#a855f7", 0.22),
      circle6: hexToRgba("#c084fc", 0.18),
      circle7: hexToRgba("#d8b4fe", 0.15),
      circle8: hexToRgba("#9333ea", 0.2),
    },
  };

  return gradients[themeColor] || gradients["#19253b"];
};

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [themeColor, setThemeColor] = useState<string>(
    typeof window !== "undefined" 
      ? localStorage.getItem("selectedThemeColor") || "#19253b"
      : "#19253b"
  );

  useEffect(() => {
    // Подписываемся на событие изменения темы
    const handleThemeChange = (e: CustomEvent) => {
      if (e.detail?.color) {
        setThemeColor(e.detail.color);
      }
    };

    // Подписываемся на изменения localStorage (для синхронизации между вкладками)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selectedThemeColor" && e.newValue) {
        setThemeColor(e.newValue);
      }
    };

    // Периодическая проверка (на случай, если событие не сработало)
    const interval = setInterval(() => {
      const currentColor = localStorage.getItem("selectedThemeColor");
      if (currentColor) {
        setThemeColor((prevColor) => {
          if (prevColor !== currentColor) {
            return currentColor;
          }
          return prevColor;
        });
      }
    }, 100);

    window.addEventListener("theme-color-changed", handleThemeChange as EventListener);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("theme-color-changed", handleThemeChange as EventListener);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const gradients = getThemeGradients(themeColor);

  return (
    <div className="background-widget" aria-hidden="true" role="presentation">
      <div className="background-gradient">
        <div 
          className="gradient-layer layer-1"
          style={{
            background: `linear-gradient(135deg, ${gradients.primary} 0%, ${gradients.secondary} 35%, ${gradients.tertiary} 70%, ${gradients.accent} 100%)`
          }}
        ></div>
        <div 
          className="gradient-layer layer-2"
          style={{
            background: `
              radial-gradient(circle at 20% 20%, ${gradients.circle1}, transparent 40%),
              radial-gradient(circle at 80% 25%, ${gradients.circle2}, transparent 35%),
              radial-gradient(circle at 35% 80%, ${gradients.circle3}, transparent 32%),
              radial-gradient(circle at 65% 15%, ${gradients.circle5}, transparent 28%),
              radial-gradient(circle at 15% 60%, ${gradients.circle6}, transparent 30%)
            `
          }}
        ></div>
        <div 
          className="gradient-layer layer-3"
          style={{
            background: `
              radial-gradient(circle at 60% 50%, ${gradients.circle4}, transparent 30%),
              radial-gradient(circle at 85% 70%, ${gradients.circle7}, transparent 25%),
              radial-gradient(circle at 25% 85%, ${gradients.circle8}, transparent 28%)
            `
          }}
        ></div>
      </div>
      <div className="animated-circles">
        <div 
          className="circle circle-1"
          style={{
            background: `radial-gradient(circle, ${gradients.circle1} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-2"
          style={{
            background: `radial-gradient(circle, ${gradients.circle2} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-3"
          style={{
            background: `radial-gradient(circle, ${gradients.circle3} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-4"
          style={{
            background: `radial-gradient(circle, ${gradients.circle4} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-5"
          style={{
            background: `radial-gradient(circle, ${gradients.circle5} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-6"
          style={{
            background: `radial-gradient(circle, ${gradients.circle6} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-7"
          style={{
            background: `radial-gradient(circle, ${gradients.circle7} 0%, transparent 70%)`
          }}
        ></div>
        <div 
          className="circle circle-8"
          style={{
            background: `radial-gradient(circle, ${gradients.circle8} 0%, transparent 70%)`
          }}
        ></div>
      </div>
    </div>
  );
};

export default Widget;

