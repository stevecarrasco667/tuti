import { Toucan } from 'toucan-js';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// [Sprint 3] Global instances for production observability
let sentryInstance: Toucan | null = null;
let discordWebhookUrl: string | null = null;

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
    setAlertConfig(config: { sentryDsn?: string, discordWebhook?: string }) {
        if (config.sentryDsn && !sentryInstance) {
            sentryInstance = new Toucan({
                dsn: config.sentryDsn,
                // Request context is optional in Toucan. We use it mainly for exception tracking
            });
        }
        if (config.discordWebhook) {
            discordWebhookUrl = config.discordWebhook;
        }
    },

    debug(event: string, context?: LogContext): void {
        console.log(formatEntry('DEBUG', event, context));
    },

    info(event: string, context?: LogContext): void {
        console.log(formatEntry('INFO', event, context));
    },

    warn(event: string, context?: LogContext): void {
        console.warn(formatEntry('WARN', event, context));
    },

    error(event: string, context: LogContext, error: Error): void {
        console.error(formatEntry('ERROR', event, context, error));

        // [Sprint 3] Observability - Track via Sentry
        if (sentryInstance) {
            sentryInstance.setTags({
                event,
                roomId: context.roomId || 'unknown',
                userId: context.userId || 'unknown'
            });
            sentryInstance.captureException(error);
        }

        // [Sprint 3] Observability - Alert via Discord Webhook
        if (discordWebhookUrl) {
            const payload = {
                content: `🚨 **Tuti Server Error**: \`${event}\`\n**Room**: ${context.roomId || 'N/A'} | **User**: ${context.userId || 'N/A'}\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n**Error**: ${error.message}`
            };
            
            // Fire and forget, don't await or block
            fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.error('Failed to send Discord webhook', e));
        }
    }
};
