import React, { createContext, useContext, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    message: '',
    title: 'Konfirmasi',
    onConfirm: null,
    onCancel: null,
  });

  const confirm = (message, title = 'Perhatian!') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        message,
        title,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal 
        isOpen={modalState.isOpen} 
        message={modalState.message} 
        title={modalState.title}
        onConfirm={modalState.onConfirm} 
        onCancel={modalState.onCancel} 
      />
    </ConfirmContext.Provider>
  );
};
