import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';

interface UPlotChartProps {
  data: any; // AlignedData [x, y0, y1, ...]
  width: number;
  height: number;
}

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

const UPlotChart: React.FC<UPlotChartProps> = ({ data, width, height }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uPlotInstance = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length < 2) return;

    // Create series config dynamically based on data length (excluding X axis)
    const seriesCount = data.length - 1;
    const series: uPlot.Series[] = [{}]; // X series

    for (let i = 0; i < seriesCount; i++) {
      series.push({
        label: `维度 ${i + 1}`,
        stroke: COLORS[i % COLORS.length],
        width: 1, // 修改此处：从 2 改为 1，使线段更细
        points: { show: false },
        spanGaps: true,
      });
    }

    const opts: uPlot.Options = {
      width,
      height,
      title: "样本数据可视化",
      cursor: {
        drag: { x: true, y: true }
      },
      // Fix: Type '{ show: false; }' is missing the following properties from type 'Select': left, top, width, height
      select: {
        show: false,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      },
      scales: {
        x: { time: false },
        y: { auto: true },
      },
      series,
      axes: [
        { 
          grid: { show: true, stroke: "#f1f5f9" },
          stroke: "#64748b",
        },
        { 
          grid: { show: true, stroke: "#f1f5f9" },
          stroke: "#64748b",
        },
      ],
      legend: {
        show: seriesCount > 1,
      }
    };

    uPlotInstance.current = new uPlot(opts, data, chartRef.current);

    return () => {
      uPlotInstance.current?.destroy();
      uPlotInstance.current = null;
    };
  }, [width, height, data.length]); // Re-create if series count changes

  // Handle data updates separately
  useEffect(() => {
    if (uPlotInstance.current && data) {
      uPlotInstance.current.setData(data, true);
    }
  }, [data]);

  return <div ref={chartRef} className="bg-white rounded-3xl shadow-inner p-4 border border-slate-100 uplot-container" />;
};

export default UPlotChart;