/**
 * Typed logger wrapper.
 *
 * This is intentionally NOT a crash-reporting SDK. Per project policy we do not
 * install Sentry / Bugsnag / Crashlytics. All logging flows through this single
 * interface so call sites stay consistent; in production it is silent.
 */

type LogContext = Record<string, unknown>;

function devLog(
  method: 'log' | 'info' | 'warn' | 'error',
  tag: string,
  message: string,
  context?: LogContext,
): void {
  if (!__DEV__) return;
  if (context) {
    // eslint-disable-next-line no-console
    console[method](tag, message, context);
  } else {
    // eslint-disable-next-line no-console
    console[method](tag, message);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext): void =>
    devLog('log', '[crate:debug]', message, context),
  info: (message: string, context?: LogContext): void =>
    devLog('info', '[crate:info]', message, context),
  warn: (message: string, context?: LogContext): void =>
    devLog('warn', '[crate:warn]', message, context),
  error: (message: string, context?: LogContext): void =>
    devLog('error', '[crate:error]', message, context),
};
