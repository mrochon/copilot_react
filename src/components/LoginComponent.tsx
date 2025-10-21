import React from 'react';
import { useAuth } from '../AuthContext';

export const LoginComponent: React.FC = () => {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to Copilot Studio Chat</h2>
        <p>Please sign in to start chatting with your Copilot Studio agent.</p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="login-button"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
        </button>
      </div>
    </div>
  );
};