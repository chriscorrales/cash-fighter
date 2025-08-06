export interface DatabaseInterface<T> {
  findAllAmountFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number[]>;
  countFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number>;
  cleanAllData: () => Promise<void>;
  save: (data: T, processor: 'default' | 'fallback') => Promise<void>;
}


export interface DatabaseReadInterface<T> {
  findAllAmountFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number[]>;
  countFromRangeDate: (from: number, to: number, processor: 'default' | 'fallback') => Promise<number>;
}


export interface DatabaseWriteInterface<T> {
  cleanAllData: () => Promise<void>;
  save: (data: T, processor: 'default' | 'fallback') => Promise<void>;
}
