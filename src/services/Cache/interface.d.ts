export interface Cache<T> {
  /**
   * Stores a value in the cache.
   * @param value - The data to be stored
   */
  set(value: T): Promise<void>;
  /**
   * Retrieves a value from the cache.
   * @returns The cached value or `undefined` if not found
   */
  get(key: string): Promise<string | undefined>;
}