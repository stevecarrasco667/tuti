import { describe, it, expect } from 'vitest';
import { verifyJWT } from '../utils/jwt';

// Helper to encode a string to base64url
function base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper to sign a mock JWT with HS256 using subtle crypto (simulated Supabase token)
async function createMockJWT(payload: any, secret: string, expired = false): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encoder = new TextEncoder();
    
    // Set exp claim
    const nowSec = Math.floor(Date.now() / 1000);
    const exp = expired ? nowSec - 60 : nowSec + 3600;
    const finalPayload = { ...payload, exp };
    
    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(finalPayload));
    
    const tokenWithoutSig = `${headerB64}.${payloadB64}`;
    
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(tokenWithoutSig)
    );
    
    const signatureBytes = new Uint8Array(signatureBuffer);
    let binary = '';
    for (let i = 0; i < signatureBytes.byteLength; i++) {
        binary += String.fromCharCode(signatureBytes[i]);
    }
    const signatureB64 = base64UrlEncode(binary);
    
    return `${tokenWithoutSig}.${signatureB64}`;
}

describe('JWT Local Verification (WebCrypto)', () => {
    const TEST_SECRET = 'supabase-project-jwt-secret-key-123456';
    const TEST_PAYLOAD = {
        sub: 'f81cb6b9-57f0-44bf-a6fb-e612efe891db',
        email: 'user@example.com',
        role: 'authenticated'
    };

    it('should successfully verify a valid signed JWT', async () => {
        const token = await createMockJWT(TEST_PAYLOAD, TEST_SECRET);
        const result = await verifyJWT(token, TEST_SECRET);
        
        expect(result.isValid).toBe(true);
        expect(result.payload.sub).toBe(TEST_PAYLOAD.sub);
        expect(result.payload.email).toBe(TEST_PAYLOAD.email);
        expect(result.error).toBeUndefined();
    });

    it('should reject a JWT signed with an incorrect secret', async () => {
        const token = await createMockJWT(TEST_PAYLOAD, TEST_SECRET);
        const result = await verifyJWT(token, 'different-wrong-secret');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Signature verification failed');
    });

    it('should reject an expired JWT', async () => {
        const token = await createMockJWT(TEST_PAYLOAD, TEST_SECRET, true);
        const result = await verifyJWT(token, TEST_SECRET);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Token has expired');
    });

    it('should reject malformed tokens', async () => {
        const result1 = await verifyJWT('header.payload', TEST_SECRET);
        expect(result1.isValid).toBe(false);
        expect(result1.error).toBe('Malformed token (must have 3 parts)');

        const result2 = await verifyJWT('not-a-token', TEST_SECRET);
        expect(result2.isValid).toBe(false);
        expect(result2.error).toBe('Malformed token (must have 3 parts)');
    });

    it('should reject unsupported algorithms', async () => {
        // Create custom token with RS256 alg
        const header = { alg: 'RS256', typ: 'JWT' };
        const headerB64 = base64UrlEncode(JSON.stringify(header));
        const payloadB64 = base64UrlEncode(JSON.stringify(TEST_PAYLOAD));
        const fakeToken = `${headerB64}.${payloadB64}.fakeSignature`;

        const result = await verifyJWT(fakeToken, TEST_SECRET);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Unsupported algorithm: RS256');
    });
});
