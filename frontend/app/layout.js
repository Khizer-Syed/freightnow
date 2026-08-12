'use client';
import './globals.css';
import { useRouter } from 'next/navigation';
import { Auth0Provider } from '@auth0/auth0-react';
import AuthBridge from '@/components/AuthBridge';

export default function RootLayout({ children }) {
  const router = useRouter();

  function handleRedirectCallback(appState) {
    router.replace(appState?.returnTo || '/portal');
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Auth0Provider
          domain="dev-1j30e4bjorr1z8ps.us.auth0.com"
          clientId="tjR12i3hvfIoJhkaZxRpSCiFlf6x5bYT"
          authorizationParams={{
            redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
            audience: 'https://api.iffcargo.com',
          }}
          cacheLocation="localstorage"
          onRedirectCallback={handleRedirectCallback}
        >
          <AuthBridge>{children}</AuthBridge>
        </Auth0Provider>
      </body>
    </html>
  );
}
