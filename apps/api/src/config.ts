export type DependencyStatus = "configured" | "missing";

export type ApiConfig = {
  host: string;
  port: number;
  dependencies: {
    mysql: DependencyStatus;
    redis: DependencyStatus;
  };
};

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3001;

const hasValue = (value: string | undefined): boolean => value !== undefined && value.trim() !== "";

const readPort = (value: string | undefined): number => {
  if (!hasValue(value)) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
};

const dependencyStatus = (...values: Array<string | undefined>): DependencyStatus =>
  values.some(hasValue) ? "configured" : "missing";

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ApiConfig => ({
  host: env.HOST ?? DEFAULT_HOST,
  port: readPort(env.PORT),
  dependencies: {
    mysql: dependencyStatus(env.DATABASE_URL, env.MYSQL_URL, env.MYSQL_HOST),
    redis: dependencyStatus(env.REDIS_URL, env.REDIS_HOST)
  }
});
