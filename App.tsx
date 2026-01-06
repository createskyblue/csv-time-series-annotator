
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import UPlotChart from './uplot-wrapper';
import { Sample, ProjectData } from './types';

const App: React.FC = () => {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [labels, setLabels] = useState<string[]>(['正常', '异常', '噪声']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [projectTitle, setProjectTitle] = useState('CSV时间序列标注工程');
  const [labelTextarea, setLabelTextarea] = useState('正常\n异常\n噪声');
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(true);
  const [jumpInputValue, setJumpInputValue] = useState('1');
  const [activeHotkey, setActiveHotkey] = useState<string | null>(null);
  const [timeScaleCoefficient, setTimeScaleCoefficient] = useState(1.0);

  // Sync jump input when index changes
  useEffect(() => {
    setJumpInputValue((currentIndex + 1).toString());
  }, [currentIndex]);

  // Computed: Group samples by file for the file tree
  const fileList = useMemo(() => {
    const groups: Record<string, { count: number; firstIndex: number }> = {};
    samples.forEach((s, idx) => {
      if (!groups[s.sourceFileName]) {
        groups[s.sourceFileName] = { count: 0, firstIndex: idx };
      }
      groups[s.sourceFileName].count++;
    });
    return Object.entries(groups).map(([name, info]) => ({
      name,
      ...info
    }));
  }, [samples]);

  // Sync labels from textarea
  useEffect(() => {
    const lines = labelTextarea.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    setLabels(lines);
  }, [labelTextarea]);

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (samples.length === 0) return;
    setCurrentIndex(prev => {
      if (direction === 'prev') return Math.max(0, prev - 1);
      return Math.min(samples.length - 1, prev + 1);
    });
  }, [samples.length]);

  const handleJumpSubmit = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num)) {
      const targetIndex = Math.max(0, Math.min(samples.length - 1, num - 1));
      setCurrentIndex(targetIndex);
      setJumpInputValue((targetIndex + 1).toString());
    } else {
      setJumpInputValue((currentIndex + 1).toString());
    }
  };

  const jumpToFile = (fileName: string) => {
    const fileInfo = fileList.find(f => f.name === fileName);
    if (fileInfo) {
      setCurrentIndex(fileInfo.firstIndex);
    }
  };

  const removeFile = (fileName: string) => {
    const newSamples = samples.filter(s => s.sourceFileName !== fileName);
    setSamples(newSamples);
    if (currentIndex >= newSamples.length) {
      setCurrentIndex(Math.max(0, newSamples.length - 1));
    }
  };

  const jumpFileNavigation = useCallback((direction: 'prev' | 'next') => {
    if (samples.length === 0) return;
    const currentFile = samples[currentIndex].sourceFileName;

    if (direction === 'next') {
      const nextFileIndex = samples.findIndex((s, i) => i > currentIndex && s.sourceFileName !== currentFile);
      if (nextFileIndex !== -1) setCurrentIndex(nextFileIndex);
    } else {
      const firstIndexOfCurrent = samples.findIndex(s => s.sourceFileName === currentFile);
      if (currentIndex > firstIndexOfCurrent) {
        setCurrentIndex(firstIndexOfCurrent);
      } else if (firstIndexOfCurrent > 0) {
        const prevFile = samples[firstIndexOfCurrent - 1].sourceFileName;
        const firstIndexOfPrev = samples.findIndex(s => s.sourceFileName === prevFile);
        setCurrentIndex(firstIndexOfPrev);
      }
    }
  }, [samples, currentIndex]);

  const setLabelForCurrent = useCallback((label: string) => {
    if (samples.length === 0) return;
    setSamples(prev => {
      const newSamples = [...prev];
      if (newSamples[currentIndex]) {
        newSamples[currentIndex].label = label;
      }
      return newSamples;
    });
    navigate('next');
  }, [currentIndex, samples.length, navigate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isKeyboardEnabled) return;
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) return;

    const key = e.key;
    const lowerKey = key.toLowerCase();

    // Navigation
    if (lowerKey === 'a') navigate('prev');
    else if (lowerKey === 'd') navigate('next');
    else if (lowerKey === 'w') jumpFileNavigation('prev');
    else if (lowerKey === 's') jumpFileNavigation('next');

    // Label Shortcuts 1-9
    const num = parseInt(key);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      const labelIndex = num - 1;
      const label = labels[labelIndex];
      if (label) {
        setActiveHotkey(label);
        setLabelForCurrent(label);
      }
    }
  }, [navigate, jumpFileNavigation, isKeyboardEnabled, labels, setLabelForCurrent]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      setActiveHotkey(null);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allNewSamples: Sample[] = [];
    const fileArr = Array.from(files) as File[];
    
    for (const file of fileArr) {
      const text = await file.text();
      const results = Papa.parse(text, { header: false, dynamicTyping: true, skipEmptyLines: 'greedy' });

      const parsed = results.data
        .map((row: any, idx) => {
          const isProbablyHeader = row.some((v: any) => typeof v === 'string' && v.trim() !== '' && isNaN(Number(v)));
          if (isProbablyHeader) return null;

          const numericData = row.map((v: any) => {
            if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return NaN;
            return Number(v);
          }).filter((v: any) => !isNaN(v));
          
          if (numericData.length === 0) return null;

          return {
            id: `${file.name}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            data: numericData,
            label: null,
            originalRow: row,
            sourceFileName: file.name
          } as Sample;
        })
        .filter((s): s is Sample => s !== null && s.data.length > 1);

      allNewSamples.push(...parsed);
    }

    setSamples(prev => [...prev, ...allNewSamples]);
    if (samples.length === 0 && allNewSamples.length > 0) setCurrentIndex(0);
    e.target.value = '';
  };

  const exportLabelledCSVs = () => {
    const fileGroups: Record<string, Sample[]> = {};
    samples.forEach(s => {
      if (!fileGroups[s.sourceFileName]) fileGroups[s.sourceFileName] = [];
      fileGroups[s.sourceFileName].push(s);
    });

    Object.entries(fileGroups).forEach(([sourceName, fileSamples]) => {
      const baseName = sourceName.replace(/\.[^/.]+$/, "");
      labels.forEach(label => {
        const filtered = fileSamples.filter(s => s.label === label);
        if (filtered.length === 0) return;
        const csv = Papa.unparse(filtered.map(s => s.originalRow), { header: false });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${projectTitle}_${baseName}_${label}.csv`;
        link.click();
      });
    });
  };

  const exportProject = () => {
    const project: ProjectData = { 
      version: '1.2', 
      projectTitle: projectTitle, 
      samples: samples, 
      labels: labels, 
      currentIndex: currentIndex, 
      timeScaleCoefficient: timeScaleCoefficient 
    };
    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectTitle}_工程.json`;
    link.click();
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string) as ProjectData;
        setSamples(project.samples || []);
        setLabels(project.labels || []);
        setLabelTextarea((project.labels || []).join('\n'));
        setCurrentIndex(project.currentIndex || 0);
        setProjectTitle(project.projectTitle || '导入的项目');
        setTimeScaleCoefficient(project.timeScaleCoefficient ?? 1.0);
      } catch (err) { alert("项目导入失败。"); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const currentSample = samples[currentIndex];
  
  // Calculate X-axis values by multiplying indices with the timeScaleCoefficient
  const uPlotData: [number[], number[]] = useMemo(() => {
    if (!currentSample) return [[], []];
    const xAxis = Array.from({ length: currentSample.data.length }, (_, i) => i * timeScaleCoefficient);
    return [xAxis, currentSample.data];
  }, [currentSample, timeScaleCoefficient]);

  const totalLabeled = samples.filter(s => s.label !== null).length;
  const progressPercent = samples.length > 0 ? (totalLabeled / samples.length) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white p-4 shadow-xl flex justify-between items-center z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-sm font-black tracking-tight uppercase opacity-50 hidden sm:block">CSV时间序列标注工具</h1>
          </div>

          <div className="h-6 w-[1px] bg-slate-700 mx-2"></div>

          <div className="relative group">
            <input 
              type="text" 
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-xl font-black text-white px-2 py-1 transition-all w-48 sm:w-64 hover:bg-slate-800 rounded"
              placeholder="命名您的项目..."
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3">
             <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
             </div>
             <span className="text-xs font-bold tabular-nums">
                {totalLabeled} / {samples.length} ({Math.round(progressPercent)}%)
             </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">数据管理</h2>
            <div className="space-y-3">
              <label className="block p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-white transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  <span className="text-xs font-bold text-slate-600">添加数据 (CSV)</span>
                  <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" />
                </div>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={exportProject} className="py-2 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg transition active:scale-95">保存工程</button>
                <label className="py-2 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg transition text-center cursor-pointer active:scale-95">
                  载入工程
                  <input type="file" accept=".json" onChange={importProject} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="p-5 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">全局配置</h2>
            <div className="space-y-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500">时间轴单位系数 (X轴)</span>
                <input 
                  type="number" 
                  step="0.001"
                  value={timeScaleCoefficient}
                  onChange={(e) => setTimeScaleCoefficient(parseFloat(e.target.value) || 1.0)}
                  className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all font-mono"
                  placeholder="如: 0.1, 0.005..."
                />
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <h2 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest flex justify-between">
              文件列表 <span>{fileList.length}</span>
            </h2>
            {fileList.length > 0 ? (
              <ul className="space-y-1">
                {fileList.map(file => (
                  <li 
                    key={file.name}
                    className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                      currentSample?.sourceFileName === file.name 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500 pl-3' 
                      : 'hover:bg-slate-50 text-slate-600 pl-3'
                    }`}
                    onClick={() => jumpToFile(file.name)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <svg className={`w-4 h-4 flex-shrink-0 ${currentSample?.sourceFileName === file.name ? 'text-blue-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tabular-nums ${currentSample?.sourceFileName === file.name ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {file.count}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded transition-all"
                        title="移除文件"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10">
                <p className="text-[10px] text-slate-300 italic font-medium">暂无文件</p>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-100">
            <h2 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">标签体系</h2>
            <textarea
              value={labelTextarea}
              onChange={(e) => setLabelTextarea(e.target.value)}
              className="w-full h-32 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono transition-all resize-none"
              placeholder="每行一个标签..."
            />
             <button
              onClick={exportLabelledCSVs}
              disabled={samples.length === 0}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 10l-4 4m0 0l-4-4m4-4v12" /></svg>
              导出标注结果
            </button>
          </div>
        </aside>

        <section className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[400px] flex flex-col relative">
             <div className="absolute top-6 left-8 flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-tighter shadow-lg">
                  {currentSample?.sourceFileName || 'IDLE'}
                </span>
             </div>

            {samples.length > 0 ? (
              <div className="flex-1 flex items-center justify-center pt-8">
                <UPlotChart key={currentSample?.id + '-' + timeScaleCoefficient} data={uPlotData} width={window.innerWidth - 450} height={380} />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <p className="text-lg font-black text-slate-400">请添加数据开始标注</p>
              </div>
            )}
          </div>

          {samples.length > 0 && (
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
              <div className="flex flex-col xl:flex-row gap-8 items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={() => navigate('prev')} className="p-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-2xl transition-all border border-slate-100 active:scale-95">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="text-center min-w-[120px] flex flex-col items-center">
                    <input 
                      type="text"
                      value={jumpInputValue}
                      onChange={(e) => setJumpInputValue(e.target.value)}
                      onBlur={(e) => handleJumpSubmit(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJumpSubmit((e.target as HTMLInputElement).value)}
                      className="text-4xl font-black text-slate-800 tabular-nums w-full text-center bg-slate-50 rounded-xl border-2 border-transparent focus:border-blue-400 focus:bg-white outline-none transition-all"
                    />
                    <div className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest opacity-60">
                      /{samples.length} 样本
                    </div>
                  </div>
                  <button onClick={() => navigate('next')} className="p-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-2xl transition-all border border-slate-100 active:scale-95">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center min-w-[160px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">当前状态</span>
                  <div className={`text-xl font-black ${currentSample?.label ? 'text-blue-600' : 'text-slate-200'}`}>
                    {currentSample?.label || '未标注'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {labels.map((label, idx) => (
                    <button
                      key={label}
                      onMouseDown={() => setActiveHotkey(label)}
                      onMouseUp={() => setActiveHotkey(null)}
                      onMouseLeave={() => setActiveHotkey(null)}
                      onClick={() => setLabelForCurrent(label)}
                      className={`px-6 py-3 rounded-xl font-black border-2 transition-all shadow-sm flex items-center gap-2 group/btn ${
                        currentSample?.label === label 
                        ? (activeHotkey === label ? 'bg-blue-700 border-blue-700 scale-95 shadow-inner' : 'bg-blue-600 border-blue-600 text-white scale-105') 
                        : (activeHotkey === label ? 'bg-blue-100 border-blue-300 scale-95 shadow-inner text-blue-700' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 active:scale-95 active:bg-blue-100')
                      } ${activeHotkey === label ? 'scale-95 brightness-90' : ''}`}
                    >
                      {idx < 9 && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          currentSample?.label === label 
                          ? 'bg-blue-500 border-blue-400 text-white' 
                          : 'bg-slate-50 border-slate-100 text-slate-400 group-hover/btn:bg-blue-100 group-hover/btn:border-blue-200 group-hover/btn:text-blue-500'
                        } ${activeHotkey === label ? 'bg-blue-600 text-white border-blue-400' : ''}`}>
                          {idx + 1}
                        </span>
                      )}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 grid grid-cols-4 gap-4 text-[9px] text-slate-400 font-black uppercase tracking-widest text-center">
                <div><kbd className="px-2 py-1 bg-slate-100 rounded text-slate-800 font-mono text-xs">W/S</kbd><br/>切换文件</div>
                <div><kbd className="px-2 py-1 bg-slate-100 rounded text-slate-800 font-mono text-xs">A/D</kbd><br/>切换样本</div>
                <div><kbd className="px-2 py-1 bg-slate-100 rounded text-slate-800 font-mono text-xs">1-9</kbd><br/>快速选择标签</div>
                <div>手动修改页码快速跳转</div>
              </div>
            </div>
          )}
        </section>
      </main>
      
      <footer className="bg-slate-900 text-slate-600 py-3 text-[9px] font-bold uppercase tracking-widest border-t border-slate-800 px-6 flex justify-between items-center">
        <div className="flex gap-4">
          <p>CSV时间序列标注工具 © 2026</p>
          <a 
            href="https://github.com/createskyblue/csv-time-series-annotator" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            GITHUB SOURCE
          </a>
        </div>
        <p>createskyblue@outlook.com</p>
      </footer>
    </div>
  );
};

export default App;
