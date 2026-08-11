export interface ApiResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

/** Success result. `message` is an optional success/notice string. */
export function ok<T = void>(message?: string, data?: T): ApiResult<T> {
  return { success: true, message, data };
}

export function fail<T = void>(message: string): ApiResult<T> {
  return { success: false, message };
}
