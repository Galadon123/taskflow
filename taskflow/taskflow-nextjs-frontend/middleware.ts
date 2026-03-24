import { NextRequest, NextResponse } from 'next/server';
import { isTokenExpired } from './lib/auth';

const publicPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.includes(pathname)) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;

    // Redirect to login if no token
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
