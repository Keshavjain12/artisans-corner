import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes.jsx';
import { fetchCurrentUser, sessionExpired } from './store/authSlice.js';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  useEffect(() => {
    const onExpired = () => dispatch(sessionExpired());
    window.addEventListener('ac:session-expired', onExpired);
    return () => window.removeEventListener('ac:session-expired', onExpired);
  }, [dispatch]);

  return (
    <>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        gutter={10}
        toastOptions={{
          duration: 3200,
          style: {
            background: '#FFFFFF',
            color: '#1F1B18',
            border: '1px solid #F3EDE6',
            borderRadius: '14px',
            boxShadow: '0 18px 40px -20px rgba(31,27,24,0.35)',
            fontSize: '14px',
            padding: '12px 14px',
          },
          success: { iconTheme: { primary: '#5F7A5B', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' } },
        }}
      />
    </>
  );
}
