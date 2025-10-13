import { renderLandingPage } from './HomePage';
import { renderRegistrationPage } from './Modes/GuestMode/multiMode.ts/multiPlayer';
import { renderGamePage } from './game/GamePage';
import { GuestPage } from './Modes/GuestMode/GuestPage';
import {NotFoundPage} from './pages/Error404';
import {renderOpponentSettingsPage} from './Modes/GuestMode/singleMode/singlePlayer'
export function initRouter() {
  const app = document.getElementById('app');
  if (!app) return;

  const path = window.location.pathname;
  render(path);

  window.onpopstate = () => render(window.location.pathname);
}

function render(path: string) {
  const app = document.getElementById('app');
  if (!app) return;

  if(path === '/guestmode'){
    GuestPage();
  }
  else if (path === '/game') {
    renderGamePage("guest");
  } else if (path === '/multimode') {
    renderRegistrationPage();
  }
  else if(path === '/singlemode'){
    renderOpponentSettingsPage();
  }
   else if(path === '/') {
    renderLandingPage();
  }
  else{
    NotFoundPage();
  }
}
