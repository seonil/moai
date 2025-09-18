interface RetryOptions {
  retries?: number;
  minTimeout?: number;
  factor?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    minTimeout = 800,
    factor = 2,
    onRetry,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      onRetry?.(attempt + 1, error);
      const delay = minTimeout * Math.pow(factor, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("재시도 후에도 작업이 실패했습니다.");
}