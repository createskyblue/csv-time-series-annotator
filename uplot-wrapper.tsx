
import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';

interface UPlotChartProps {
  data: [number[], number[]]; // [X-axis, Y-axis]
  width: number;
  height: number;
}

const UPlotChart: React.FC<UPlotChartProps> = ({ data, width, height }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const uPlotInstance = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const opts: uPlot.Options = {
      width,
      height,
      title: "样本数据可视化",
      scales: {
        x: { time: false },
      },
      series: [
        {},
        {
          stroke: "#3b82f6",
          width: 2,
          points: { show: false },
        },
      ],
      axes: [
        { grid: { show: true } },
        { grid: { show: true } },
      ],
    };

    uPlotInstance.current = new uPlot(opts, data, chartRef.current);

    return () => {
      uPlotInstance.current?.destroy();
      uPlotInstance.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    if (uPlotInstance.current) {
      uPlotInstance.current.setData(data);
    }
  }, [data]);

  return <div ref={chartRef} className="bg-white rounded shadow p-2" />;
};

export default UPlotChart;
