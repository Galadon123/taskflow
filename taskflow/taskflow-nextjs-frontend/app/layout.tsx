import '@/app/globals.css';
import { ReactNode } from 'react';

export const metadata = {
    title: 'TaskFlow',
    description: 'Manage your projects and tasks',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
