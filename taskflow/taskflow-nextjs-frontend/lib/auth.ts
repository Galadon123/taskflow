import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key'
);

export async function verifyAuth(token: string) {
    try {
        const verified = await jwtVerify(token, secret);
        return verified.payload;
    } catch (err) {
        return null;
    }
}

export function decodeToken(token: string) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const decoded = JSON.parse(
            Buffer.from(parts[1], 'base64').toString()
        );
        return decoded;
    } catch (err) {
        return null;
    }
}

export function isTokenExpired(token: string): boolean {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
}
