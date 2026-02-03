import { vi } from 'vitest';
import type * as Party from "partykit/server";

export function createMockConnection(id: string): Party.Connection {
    return {
        id,
        uri: `ws://localhost:1999/party/${id}`,
        send: vi.fn(),
        close: vi.fn(),
        setState: vi.fn(),
        serialize: vi.fn(),
        deserialize: vi.fn(),
    } as unknown as Party.Connection;
}

export function createMockRoom(id: string): Party.Room {
    const connections = new Map<string, Party.Connection>();

    // Mock Storage
    const storageMap = new Map<string, any>();
    const storage = {
        get: vi.fn(async (key: string) => storageMap.get(key)),
        put: vi.fn(async (key: string, value: any) => storageMap.set(key, value)),
        delete: vi.fn(async (key: string) => storageMap.delete(key)),
        list: vi.fn(async () => storageMap),
        setAlarm: vi.fn(),
        getAlarm: vi.fn(),
        deleteAlarm: vi.fn(),
        getAlarms: vi.fn(async () => new Map()),
    } as unknown as Party.Storage;

    return {
        id,
        internalID: id,
        env: {},
        storage,
        connections,
        getConnection: (connId: string) => connections.get(connId),
        getConnections: () => Array.from(connections.values()),
        broadcast: vi.fn((_msg: string, _without?: string[]) => {
            // Optional: simulate sending to connections
        }),
    } as unknown as Party.Room;
}

export function createMockContext(url: string): Party.ConnectionContext {
    return {
        request: {
            url: url
        } as unknown as Request
    } as unknown as Party.ConnectionContext;
}
