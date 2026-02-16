type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
    roomId?: string;
    userId?: string;
    connectionId?: string;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    event: string;
    context?: LogContext;
    error?: string;
    stack?: string;
}

function formatEntry(level: LogLevel, event: string, context?: LogContext, error?: Error): string {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        event,
    };

    if (context && Object.keys(context).length > 0) {
        entry.context = context;
    }

    if (error) {
        entry.error = error.message;
        entry.stack = error.stack;
    }

    return JSON.stringify(entry);
}

export const logger = {
    info(event: string, context?: LogContext): void {
        console.log(formatEntry('INFO', event, context));
    },

    warn(event: string, context?: LogContext): void {
        console.warn(formatEntry('WARN', event, context));
    },

    error(event: string, context: LogContext, error: Error): void {
        console.error(formatEntry('ERROR', event, context, error));
    }
};
