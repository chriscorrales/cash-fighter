export interface Consumer<T> {
  pop: (batchSize: number) => Promise<T[] | null>;
}