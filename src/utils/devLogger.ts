/**
 * [S1-T1] Production-safe logger utility.
 * Logs are only emitted in DEV mode — never in production builds.
 * Replace console.log calls with devLog() throughout the codebase.
 */
const isDev = import.meta.env.DEV;

export const devLog = (...args: unknown[]): void => {
    if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
};
