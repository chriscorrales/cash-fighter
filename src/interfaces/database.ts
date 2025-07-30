export interface DatabaseInterface<T> {
  findFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<T[]>;
  countFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number>;
  save: (data: T, processor: 'default' | 'fallback') => Promise<void>;
}
