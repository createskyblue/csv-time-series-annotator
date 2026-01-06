
export interface Sample {
  id: number;
  data: number[];
  label: string | null;
  originalRow: any; // Store original CSV row for re-exporting
}

export interface ProjectData {
  version: string;
  fileName: string;
  samples: Sample[];
  labels: string[];
  currentIndex: number;
}
