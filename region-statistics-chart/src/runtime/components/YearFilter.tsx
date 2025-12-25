/** @jsx jsx */
import { React, jsx } from "jimu-core";

interface YearFilterProps {
  selectedYear: number;
  years: number[];
  onYearChange: (year: number) => void;
}

const YearFilter: React.FC<YearFilterProps> = ({
  selectedYear,
  years,
  onYearChange,
}) => {

  if (years.length === 0) {
    return null;
  }

  return (
    <div className="year-filter">
      <div className="year-filter__container">
        {years.map((year) => (
          <button
            key={year}
            className={`year-filter__button ${
              selectedYear === year ? "year-filter__button--active" : ""
            }`}
            onClick={() => onYearChange(year)}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
};

export default YearFilter;

