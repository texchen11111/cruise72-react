import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { createPlannerStore } from './store/index.js';
import './styles/style.css';
const store = createPlannerStore();
const root = createRoot(document.getElementById('app'));
root.render(<App store={store} />);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    root.unmount();
    store.destroy();
  });
