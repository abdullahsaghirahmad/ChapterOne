import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'signin' | 'signup';
  showAuthModal: (mode?: 'signin' | 'signup') => void;
  hideAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
}

export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const showAuthModal = (initialMode: 'signin' | 'signup' = 'signin') => {
    setMode(initialMode);
    setIsOpen(true);
  };

  const hideAuthModal = () => {
    setIsOpen(false);
  };

  const value = {
    isOpen,
    mode,
    showAuthModal,
    hideAuthModal,
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};