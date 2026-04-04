export type AnnotationMode = 'classification' | 'prediction';
export type ExportMode = 'by-label' | 'combined';

export interface Sample {
  id: string;
  data: number[];
  label: string | number | null;
  originalRow: any;
  sourceFileName: string;
}

export interface ProjectData {
  version: string;
  projectTitle: string;
  samples: Sample[];
  labels: string[];
  currentIndex: number;
  annotationMode?: AnnotationMode;
  exportMode?: ExportMode;
  timeScaleCoefficient?: number;
  dimensionsCount?: number;
}
