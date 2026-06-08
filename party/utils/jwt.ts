/**
 * Utility for local cryptographic JWT verification using WebCrypto API (HS256).
 * Safe for Cloudflare Workers / PartyKit environment.
 */

// Helper to decode base64url encoding
function decodeBase64Url(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return atob(base64);
}

// Helper to convert base64url signature to ArrayBuffer
function base64UrlToBuffer(str: string): ArrayBuffer {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

export interface JWTVerifyResult {
    isValid: boolean;
    payload?: any;
    error?: string;
}

/**
 * Verifies a JWT signed with HS256 locally using WebCrypto.
 * @param token The raw JWT token string
 * @param secret The shared HMAC secret string (SUPABASE_JWT_SECRET)
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTVerifyResult> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { isValid: false, error: 'Malformed token (must have 3 parts)' };
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // 1. Decode header and verify alg
        const headerJSON = JSON.parse(decodeBase64Url(headerB64));
        if (headerJSON.alg !== 'HS256') {
            return { isValid: false, error: `Unsupported algorithm: ${headerJSON.alg}` };
        }

        // 2. Decode payload and check exp / nbf
        const payload = JSON.parse(decodeBase64Url(payloadB64));
        const nowSec = Math.floor(Date.now() / 1000);

        if (payload.exp && nowSec >= payload.exp) {
            return { isValid: false, error: 'Token has expired', payload };
        }

        if (payload.nbf && nowSec < payload.nbf) {
            return { isValid: false, error: 'Token is not yet active', payload };
        }

        // 3. Cryptographic signature verification using WebCrypto SubtleCrypto
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const signatureBuffer = base64UrlToBuffer(signatureB64);
        const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);

        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBuffer,
            dataToVerify
        );

        if (!isValid) {
            return { isValid: false, error: 'Signature verification failed', payload };
        }

        return { isValid: true, payload };
    } catch (err) {
        return { isValid: false, error: err instanceof Error ? err.message : String(err) };
    }
}
