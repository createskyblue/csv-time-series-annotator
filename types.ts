
export interface Sample {
  id: string; // Changed to string for unique identification across multiple files
  data: number[];
  label: string | null;
  originalRow: any; // Store original CSV row for re-exporting
  sourceFileName: string; // Tracks which file this sample belongs to
}

export interface ProjectData {
  version: string;
  projectTitle: string;
  samples: Sample[];
  labels: string[];
  currentIndex: number;
  timeScaleCoefficient?: number;
}
