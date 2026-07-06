import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import './index.css';

interface LoginFormData {
  email: string;
  password: string;
}

interface UserData {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
  temporal: boolean;
  editableCategories: string[];
  viewableCategories: string[];
  canEditAll: boolean;
  canOnlyView: boolean;
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'error' | 'success'>('error');

  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => setShowAlert(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  const fetchUserData = async () => {
    const token = localStorage.getItem('access_token');

    console.log('🔍 Verificando token:', token ? 'Token existe' : 'No hay token');

    if (!token) {
      console.log('❌ No hay token, mostrando login');
      setIsLoadingAuth(false);
      return;
    }

    try {
      console.log('📡 Verificando token con el backend...');
      const response = await fetch('http://localhost:3000/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('📡 Respuesta del backend:', response.status);
      const data = await response.json();
      console.log('📡 Datos recibidos:', data);

      if (data.authenticated && data.user) {
        console.log('✅ Sesión válida, usuario:', data.user.nombre);
        setUserData(data.user);
        setIsAuthenticated(true);
      } else {
        console.log('❌ Token inválido, eliminando...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('aaqa_current_route');
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('aaqa_current_route');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowAlert(false);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('access_token', data.access_token);
        setAlertType('success');
        setAlertMessage(`Bienvenido ${data.user.nombre} ${data.user.apellido}`);
        setShowAlert(true);
        setUserData(data.user);
        setIsAuthenticated(true);
      } else {
        setAlertType('error');
        setAlertMessage(data.message || 'Credenciales incorrectas');
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setAlertType('error');
      setAlertMessage('Error de conexión con el servidor');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('aaqa_current_route');
    setUserData(null);
    setIsAuthenticated(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && userData) {
    console.log('🏠 Renderizando Home con usuario:', userData.nombre);
    return <Home userData={userData} onLogout={handleLogout} />;
  }

  console.log('🔐 Mostrando pantalla de login');
  return (
    <div className="login-container">
      {showAlert && (
        <div className={`alert-toast alert-${alertType}`}>
          {alertMessage}
        </div>
      )}

      <div className="login-grid">
        <div className="login-hero">
          <div className="hero-content">
            <img
              src="/dist/assets/img/logo.png"
              alt="Logo AAQA"
              className="hero-logo"
            />
          </div>
        </div>

        <div className="login-form-wrapper">
          <div className="form-card">
            <div className="form-header">
              <h2>Bienvenido</h2>
              <p>Ingresa tus credenciales para acceder al sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>Correo electrónico</label>
                <div className="input-icon">
                  <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    name="email"
                    placeholder="correo@fundaciongloriakriete.org"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Contraseña</label>
                <div className="input-icon">
                  <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? <span className="loader"></span> : 'Iniciar sesión'}
              </button>
            </form>

            <div className="form-footer">
              <p>© {new Date().getFullYear()} Sistema AAQA. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
