import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const data = await request.json();
    const response = NextResponse.json({ success: true });
    response.cookies.set('token', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
}
