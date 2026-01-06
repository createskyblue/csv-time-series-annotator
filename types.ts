export interface Sample {
  id: string;
  data: number[];
  label: string | null;
  originalRow: any;
  sourceFileName: string;
}

export interface ProjectData {
  version: string;
  projectTitle: string;
  samples: Sample[];
  labels: string[];
  currentIndex: number;
  timeScaleCoefficient?: number;
  dimensionsCount?: number;
}