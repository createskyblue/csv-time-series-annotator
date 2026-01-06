
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import UPlotChart from './uplot-wrapper';
import { Sample, ProjectData } from './types';

const App: React.FC = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [labels, setLabels] = useState<string[]>(['正常', '异常', '噪声']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileName, setFileName] = useState('未命名.csv');
  const [labelTextarea, setLabelTextarea] = useState('正常\n异常\n噪声');
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(true);

  // 解析文本框中的标签
  useEffect(() => {
    const lines = labelTextarea.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    setLabels(lines);
  }, [labelTextarea]);

  // 键盘导航
  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (samples.length === 0) return;
    setCurrentIndex(prev => {
      if (direction === 'prev') return Math.max(0, prev - 1);
      return Math.min(samples.length - 1, prev + 1);
    });
  }, [samples.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isKeyboardEnabled) return;
    
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    if (e.key.toLowerCase() === 'a') {
      navigate('prev');
    } else if (e.key.toLowerCase() === 'd') {
      navigate('next');
    }
  }, [navigate, isKeyboardEnabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 文件加载
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: false,
      dynamicTyping: true,
      complete: (results) => {
        const parsedSamples: Sample[] = results.data
          .filter((row: any) => row.some(v => v !== null && v !== undefined && v !== ''))
          .map((row: any, idx) => {
            const numericData = row
              .map(v => Number(v))
              .filter(v => !isNaN(v));
            
            const originalRow = {};
            row.forEach((value: any, index: number) => {
              (originalRow as any)[`field${index}`] = value;
            });
            
            return {
              id: idx,
              data: numericData,
              label: null,
              originalRow
            };
          });
        setSamples(parsedSamples);
        setCurrentIndex(0);
      }
    });
  };

  // 打标签
  const setLabelForCurrent = (label: string) => {
    if (samples.length === 0) return;
    const newSamples = [...samples];
    newSamples[currentIndex].label = label;
    setSamples(newSamples);
    navigate('next');
  };

  // 导出标注后的 CSV
  const exportLabelledCSVs = () => {
    if (samples.length === 0) return;
    
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    
    labels.forEach(label => {
      const filtered = samples.filter(s => s.label === label);
      if (filtered.length === 0) return;

      const exportData = filtered.map(s => s.originalRow);
      const csv = Papa.unparse(exportData);
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${baseName}_${label}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  // 项目导入导出
  const exportProject = () => {
    const project: ProjectData = {
      version: '1.0',
      fileName,
      samples,
      labels,
      currentIndex
    };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}_项目备份.json`);
    link.click();
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project: ProjectData = JSON.parse(event.target?.result as string);
        setSamples(project.samples);
        setLabels(project.labels);
        setLabelTextarea(project.labels.join('\n'));
        setCurrentIndex(project.currentIndex);
        setFileName(project.fileName);
      } catch (err) {
        alert("项目导入失败，文件格式无效。");
      }
    };
    reader.readAsText(file);
  };

  // 为 uPlot 准备数据
  const currentSample = samples[currentIndex];
  const uPlotData: [number[], number[]] = currentSample 
    ? [Array.from({ length: currentSample.data.length }, (_, i) => i), currentSample.data]
    : [[], []];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* 顶部栏 */}
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          CSV时间序列标注工具
        </h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm bg-slate-700 px-3 py-1 rounded border border-slate-600">
            文件: {fileName}
          </span>
          <span className="text-sm bg-blue-600 px-3 py-1 rounded shadow-inner">
            {samples.length > 0 ? `${currentIndex + 1} / ${samples.length}` : '暂无数据'}
          </span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <aside className="w-80 bg-white border-r p-5 flex flex-col gap-6 overflow-y-auto">
          {/* 项目管理 */}
          <section>
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-widest">项目操作</h2>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2 cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-blue-600 font-medium transition-colors">上传 CSV 数据源</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={exportProject} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 border border-gray-200 rounded-md transition shadow-sm">导出项目</button>
                <label className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 border border-gray-200 rounded-md transition shadow-sm text-center cursor-pointer">
                  导入项目
                  <input type="file" accept=".json" onChange={importProject} className="hidden" />
                </label>
              </div>
            </div>
          </section>

          {/* 标签定义 */}
          <section className="flex flex-col flex-1">
            <h2 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-widest">标签配置</h2>
            <textarea
              value={labelTextarea}
              onChange={(e) => setLabelTextarea(e.target.value)}
              className="w-full flex-1 min-h-[120px] p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono leading-relaxed"
              placeholder="请输入标签，每行一个..."
            />
            <p className="text-[11px] text-gray-400 mt-2 italic">提示：每行一个标签。修改后将即时更新下方的打标按钮。</p>
          </section>

          {/* 最终导出 */}
          <section className="pt-4 border-t">
             <button
              onClick={exportLabelledCSVs}
              disabled={samples.length === 0}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none transition-all transform active:scale-95"
            >
              一键导出标注结果
            </button>
          </section>
        </aside>

        {/* 内容展示区 */}
        <section className="flex-1 p-8 bg-slate-50 flex flex-col gap-8 overflow-y-auto">
          {/* 图表容器 */}
          <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 min-h-[450px] relative">
            {samples.length > 0 ? (
              <UPlotChart data={uPlotData} width={window.innerWidth - 450} height={450} />
            ) : (
              <div className="w-full h-full rounded-xl flex flex-col items-center justify-center text-gray-300">
                <svg className="w-20 h-20 mb-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <p className="text-xl font-medium">请上传 CSV 文件以开始数据标注</p>
                <p className="text-sm mt-3 opacity-60">CSV 的每一行将被视为一个独立的时间序列样本。</p>
              </div>
            )}
          </div>

          {/* 控制面板 */}
          {samples.length > 0 && (
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
              <div className="flex flex-col xl:flex-row gap-8 items-center justify-between">
                {/* 导航按钮 */}
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => navigate('prev')} 
                    className="p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all group active:scale-90"
                    title="上一个 (A)"
                  >
                    <svg className="w-8 h-8 text-slate-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="text-center min-w-[140px]">
                    <span className="text-4xl font-black text-slate-800 tabular-nums">#{currentIndex + 1}</span>
                    <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest">样本索引 / 共 {samples.length}</p>
                  </div>
                  <button 
                    onClick={() => navigate('next')} 
                    className="p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all group active:scale-90"
                    title="下一个 (D)"
                  >
                    <svg className="w-8 h-8 text-slate-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                {/* 状态指示 */}
                <div className="px-6 py-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center min-w-[160px]">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter mb-1">当前标注状态</span>
                  <div className={`text-xl font-black ${currentSample?.label ? 'text-blue-700' : 'text-slate-300'}`}>
                    {currentSample?.label || '未标注'}
                  </div>
                </div>

                {/* 打标按钮组 */}
                <div className="flex flex-wrap gap-3 justify-center">
                  {labels.map(label => (
                    <button
                      key={label}
                      onClick={() => setLabelForCurrent(label)}
                      className={`px-6 py-3 rounded-xl font-bold border-2 transition-all shadow-sm transform active:scale-95 ${
                        currentSample?.label === label 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 scale-105' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 操作说明 */}
              <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap justify-center gap-10 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono">A</kbd> 上一个样本
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono">D</kbd> 下一个样本
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  将鼠标悬停在图表线上以查看精确数值
                </span>
              </div>
            </div>
          )}
        </section>
      </main>
      
      {/* 版权信息 */}
      <footer className="bg-slate-800 text-white py-3 text-center text-sm border-t border-slate-700">
        <div className="container mx-auto px-4">
          <p>createskyblue@outlook.com CSV时间序列标注工具© 2026</p>
          <a href="https://github.com/createskyblue/csv-time-series-annotator">Github</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
