import './polyfill';
import ReactDOM from 'react-dom/client';
import './tailwind.css';
import './index.css';
import 'nprogress/nprogress.css';
import reportWebVitals from './reportWebVitals';
import Layout from './Layout';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from './redux/store';
import { SocketProvider } from './SocketContext';
import { I18nProvider } from './i18n/I18nContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
      <I18nProvider>
        <SocketProvider>
          <Layout />
        </SocketProvider>
      </I18nProvider>
    </PersistGate>
  </Provider>
);

reportWebVitals();
