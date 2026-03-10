import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import toast from 'react-hot-toast';

export const Login = () => {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Error iniciando sesión: ' + error.message);
    }
  };

  return (
    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <img src="/favicon.png" alt="Gastitos Logo" style={{ width: '120px', height: '120px', marginBottom: '1.25rem', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '2.25rem', fontWeight: '700', color: '#111111', letterSpacing: '-0.025em', margin: '0 0 0.5rem 0' }}>Gastitos</h1>
          <p style={{ fontSize: '1rem', color: '#565656', margin: 0, textAlign: 'center', lineHeight: '1.5' }}>
            La forma más <strong>justa</strong> de dividir los gastos en pareja.<br />
            Cuentas <strong>claras</strong>, <strong>proporcionales</strong> a lo que cada uno gana.
          </p>
        </div>
        <button
          onClick={loginWithGoogle}
          style={{
            width: '100%',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e6e6e6',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            marginBottom: '1.5rem'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span style={{ fontSize: '15px', fontWeight: '500', color: '#333333' }}>Iniciar sesión con Google</span>
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888888', margin: 0 }}>
          Desarrollado por <a
            href="https://www.desarrollados.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#622EDB', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = '#622EDB'}
          >Desarrollados</a>
        </p>

      </div>
    </div>
  );
};
