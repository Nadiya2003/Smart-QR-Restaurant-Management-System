import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import Splash from './src/screens/Splash';
import Login from './src/screens/Login';
import Register from './src/screens/Register';
import Dashboard from './src/screens/Dashboard';

import ForgotPassword from './src/screens/ForgotPassword';
import VerifyOTP from './src/screens/VerifyOTP';
import ResetPassword from './src/screens/ResetPassword';

// Main content wrapper to consume AuthContext
const Main = () => {
  const { user, loading } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login', 'register', 'forgot_password', 'verify_otp', 'reset_password'

  // States for password reset flow
  const [resetEmail, setResetEmail] = useState('');
  const [resetOTP, setResetOTP] = useState('');

  if (!splashFinished) {
    return <Splash onFinish={() => setSplashFinished(true)} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (user) {
    return <Dashboard onLogout={() => { }} />;
  }

  // Auth Flow Routing
  switch (currentScreen) {
    case 'register':
      return (
        <Register
          onRegisterSuccess={() => setCurrentScreen('login')}
          onSwitchToLogin={() => setCurrentScreen('login')}
        />
      );
    case 'forgot_password':
      return (
        <ForgotPassword
          onOTPSent={(email) => {
            setResetEmail(email);
            setCurrentScreen('verify_otp');
          }}
          onBackToLogin={() => setCurrentScreen('login')}
        />
      );
    case 'verify_otp':
      return (
        <VerifyOTP
          email={resetEmail}
          onVerified={(otp) => {
            setResetOTP(otp);
            setCurrentScreen('reset_password');
          }}
          onBack={() => setCurrentScreen('forgot_password')}
        />
      );
    case 'reset_password':
      return (
        <ResetPassword
          email={resetEmail}
          otp={resetOTP}
          onPasswordReset={() => setCurrentScreen('login')}
        />
      );
    default:
      return (
        <Login
          onLoginSuccess={() => { }}
          onSwitchToRegister={() => setCurrentScreen('register')}
          onForgotPassword={() => setCurrentScreen('forgot_password')}
        />
      );
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Main />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

