export interface DatabaseInterface<T> {
  findAllAmountFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number[]>;
  countFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number>;
  cleanAllData: () => Promise<void>;
  save: (data: T, processor: 'default' | 'fallback') => Promise<void>;
}
