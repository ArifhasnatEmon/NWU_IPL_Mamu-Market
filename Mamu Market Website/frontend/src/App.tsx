import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppProvider } from './context/AppContext';
import { DataProvider } from './context/DataContext';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <AppProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AppProvider>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
