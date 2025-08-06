export interface Publisher<T> {
  leftPush: (value: T) => Promise<void>;
  rightPush: (value: T) => Promise<void>;
}