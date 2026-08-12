'use client';
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/portal');
    } else if (!isLoading && !isAuthenticated) {
      loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Redirecting to sign up...</p>
    </div>
  );
}
