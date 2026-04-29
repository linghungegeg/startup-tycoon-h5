export type ApiSuccess<T> = {
  success: true;
  data: T;
  traceId: string;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
  traceId: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type HealthStatus = {
  service: string;
  status: "ok";
  timestamp: string;
  dependencies: {
    mysql: "configured";
    redis: "configured";
  };
};

export const createApiSuccess = <T>(data: T, traceId: string): ApiSuccess<T> => ({
  success: true,
  data,
  traceId
});
