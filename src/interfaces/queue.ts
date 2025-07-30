export interface QueueInterface<T> {
  leftPush: (value: T) => Promise<void>;
  rightPush: (value: T) => Promise<void>;
  pop: (count: number) => Promise<T[] | null>;
}
