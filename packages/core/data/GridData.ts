export interface GridData<T> {
  data: T[];
  totalCount: number;
  summary: T[] | null;
}
