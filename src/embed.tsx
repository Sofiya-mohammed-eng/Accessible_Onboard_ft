import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

let mount = document.getElementById('alx-onboarding');
if (!mount) {
  mount = document.createElement('div');
  mount.id = 'alx-onboarding';
  document.body.appendChild(mount);
}
createRoot(mount).render(<App />);
