import { startGame } from './GameAlgo';
import ProfileTranslations from '../languages/ProfileLanguages';

const DEFAULT_API_ORIGIN = window.location.origin.replace(/\/$/, '');
const PLAYERS_API_URL =
  (import.meta.env.VITE_PLAYERS_API_URL as string | undefined) ??
  DEFAULT_API_ORIGIN;
const MATCHES_API_URL =
  (import.meta.env.VITE_MATCHES_API_URL as string | undefined) ??
  DEFAULT_API_ORIGIN;
const USERS_API_URL =
  (import.meta.env.VITE_USERS_API_URL as string | undefined) ??
  DEFAULT_API_ORIGIN;

/** Types */
type GameSettings = {
  mode: string;
  winScore: number;
  ballSpeed: number;
  paddleSpeed: number;
};

/** Fetch players from backend */
async function getAliasQueue(): Promise<string[]> {
  const res = await fetch(`${PLAYERS_API_URL}/players`);
  const data = await res.json();

  const queue = Array.isArray(data)
    ? data
        .map((p: any) =>
          typeof p === 'string'
            ? p.trim()
            : p && typeof p.alias === 'string'
            ? p.alias.trim()
            : ''
        )
        .filter((alias: string) => alias !== '')
    : [];

  return queue;
}

/** Save match result */
async function saveMatch(winner: string, p1: string, p2: string) {
  const mode = localStorage.getItem("mode") ;
  const isAuthenticatedPlay = localStorage.getItem('authenticated_play') === 'true';
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const matchData: any = {
    winner,
    player1: p1,
    player2: p2
  };

  if (mode === "multi") {
  let matches = JSON.parse(localStorage.getItem("matches") || "[]");

  // if matches is not an array (because of old data), reset it
  if (!Array.isArray(matches)) {
    matches = [];
  }

  // Add your new match
  matches.push(matchData);

  // Save back
  localStorage.setItem("matches", JSON.stringify(matches));
}
// save to database only in profile mode
  else if(mode != "twoplayersmode"){  
  
  // Add user_id if authenticated
  if (isAuthenticatedPlay && user) {
    matchData.user_id = user.id;
  }
  
  const res = await fetch(`${MATCHES_API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchData),
  });

  if (!res.ok) {
    console.error('Failed to save match', await res.text());
    return;
  }


  // If authenticated play, update user stats
  if (isAuthenticatedPlay && user) {
    const won = winner === user.username || winner === user.display_name;
    // Update user stats
    const statsRes = await fetch(`${USERS_API_URL}/users/${user.id}/stats`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ won, experience_gained: won ? 50 : 20 })
    });
    
    if (!statsRes.ok) {
      console.error('Failed to update stats:', await statsRes.text());
    }
  }
}
}

/** ---- LOCAL STORAGE HELPERS ---- */
function getGameSettings(mode: string): GameSettings {
  const saved = localStorage.getItem(`settings_${mode}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Invalid settings in localStorage for', mode, e);
    }
  }
  return {
    mode: 'custom',
    winScore: 6,
    ballSpeed: 0.8,
    paddleSpeed: 5,
  };
}



/*** helper ***/
function showMessage(winner: string, message: string) {
  const mssg = document.getElementById('mssg');
  if (!mssg) return;
  mssg.innerHTML = `
    <div class="fixed bottom-6 left-1/2 transform -translate-x-1/2 backdrop-blur-md 
      bg-black/70 border border-purple-700 text-cyan-300 text-lg px-8 py-3 rounded-xl shadow-xl 
      animate-pulse">
      🏆 <span class="font-bold text-white">${winner}</span> ${message}
    </div>`;
}

/** ---- MAIN RENDER ---- */
export async function renderGamePage(
  mode: string,
  queueOverride?: string[],
  scores?: Record<string, number>,
  settingsOverride?: GameSettings
) {
  const app = document.getElementById('app');
  if (!app) return;

  const queue = queueOverride ?? (await getAliasQueue());
  const playerScores: Record<string, number> = scores ?? {};

  const isAuthenticatedPlay = localStorage.getItem('authenticated_play') === 'true';
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const resolveDisplayName = (name: string) => {
    if (!name) return name;
    if (!user) return name;
    const preferred = (user.display_name || '').trim();
    if (!preferred) return name;
    return name === user.username || name === preferred ? preferred : name;
  };
  
  // Translation helper
  const currentLang = localStorage.getItem('lang') || 'eng';
  function t(key: keyof typeof ProfileTranslations['eng']): string {
    return ProfileTranslations[currentLang as keyof typeof ProfileTranslations]?.[key] || ProfileTranslations['eng'][key];
  }

  //// multiMode
  if (queue.length < 2 && "multiMode" == mode ) {
    const winner = queue[0] || 'No one';
    const topPlayer = Object.entries(playerScores).sort((a, b) => b[1] - a[1])[0];
    const finalWinner = topPlayer ? topPlayer[0] : winner;
    const finalWinnerLabel = resolveDisplayName(finalWinner);
    app.innerHTML = `
      <div class="flex flex-col justify-center items-center h-screen text-white bg-gradient-to-br from-black via-purple-900 to-blue-900">
        <h1 class="text-5xl font-extrabold mb-6 text-cyan-400 drop-shadow-lg animate-pulse">${t('tournamentFinished')}</h1>
        <h2 class="text-3xl text-purple-300 mb-4">${t('champion')}: <span class="text-white">${finalWinnerLabel}</span></h2>
        ${
          topPlayer
            ? `<p class="text-lg text-gray-300 mb-6">${t('totalWins')}: <span class="text-cyan-300 font-semibold">${topPlayer[1]}</span></p>`
            : ''
        }
        <button onclick="location.href='/multimode'" 
          class="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white text-lg font-bold 
          hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-xl hover:shadow-cyan-500/50">
          ${t('backToHome')}
        </button>
      </div>
    `;
    return;
  }
  //// single mode or profile mode - game complete
  else if(queue.length < 2 && ("multiMode" != mode)){
    const winner = queue[0] || 'No one';
    const winnerLabel = resolveDisplayName(winner);
    
    app.innerHTML = `
      <div class="flex flex-col justify-center items-center h-screen text-white bg-gradient-to-br from-black via-purple-900 to-blue-900">
        <h1 class="text-5xl font-extrabold mb-6 text-cyan-400 drop-shadow-lg animate-pulse">${t('gameComplete')}</h1>
        <h2 class="text-3xl text-purple-300 mb-4">${t('winner')}: <span class="text-white">${winnerLabel}</span></h2>
        ${user && isAuthenticatedPlay ? `
          <p class="text-lg text-gray-300 mb-6">${t('statsUpdated')}</p>
          <div class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 mb-6">
            <p class="text-sm text-gray-300">${t('matchesPlayed')}: <span class="text-cyan-400 font-bold">${Object.values(playerScores).reduce((a, b) => a + b, 0) || 1}</span></p>
            <p class="text-sm text-gray-300">${t('wins')}: <span class="text-green-400 font-bold">${playerScores[winner] || 0}</span></p>
          </div>
        ` : ''}
        <button onclick="location.href='${user && isAuthenticatedPlay ? '/dashboard' : '/guestmode'}'" 
          class="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white text-lg font-bold 
          hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-xl hover:shadow-cyan-500/50">
          ${user && isAuthenticatedPlay ? t('backToDashboard') : t('backToHome')}
        </button>
      </div>
    `;
    
    // Clear authenticated play flag
    localStorage.removeItem('authenticated_play');
    return;
  }

  const [p1, p2] = queue;
  const displayP1 = resolveDisplayName(p1);
  const displayP2 = resolveDisplayName(p2);
  let settings: GameSettings;
  if (settingsOverride) {
    settings = settingsOverride;
  } else if (mode === 'multiMode') {
    settings = getGameSettings('multi');
  } else {
    settings = getGameSettings(mode);
  }

  // Determine button text based on mode
  const nextButtonText = mode === "multiMode" ? t('nextMatch') : mode === "twoplayersmode" ? t('replay'): t('nextOpponent');

  app.innerHTML = `
    <div class="relative h-screen w-screen bg-gradient-to-br from-[#0a0020] via-[#030014] to-[#000000] overflow-hidden flex flex-col justify-center items-center">
      <!-- Animated glowing beams -->
      <div class="absolute inset-0 overflow-hidden z-0">
        <div class="absolute top-0 left-1/4 w-[2px] h-full bg-gradient-to-b from-cyan-500 to-transparent opacity-30 animate-pulse"></div>
        <div class="absolute top-0 right-1/4 w-[2px] h-full bg-gradient-to-b from-pink-500 to-transparent opacity-30 animate-pulse delay-300"></div>
      </div>

      <!-- Score & Canvas -->
      <div id="mssg" class="z-20"></div>
      <canvas id="pong"
        class="z-20 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_25px_rgba(0,255,255,0.5)] backdrop-blur-md bg-black/60">
      </canvas>

      <!-- Buttons -->
      <div class="z-20 mt-10 flex gap-6 game-controls">
        <button id="nextMatch" 
          class="hidden px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white text-lg font-semibold 
          shadow-lg hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300">
          ${nextButtonText}
        </button>
        <button onclick="location.href='${mode === "profile-singleplayer" ? '/dashboard' : '/guestmode'}'"
          class="px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl text-white text-lg font-semibold 
          shadow-lg hover:shadow-red-500/30 hover:scale-105 transition-all duration-300">
          ${t('exit')}
        </button>
      </div>
    </div>
  `;

  // Start the match
  startGame(async (winnerId: string, winnerDisplay: string) => {
    await saveMatch(winnerId, p1, p2);

    // Track wins
    playerScores[winnerId] = (playerScores[winnerId] || 0) + 1;

    const decoratedWinner = winnerDisplay || resolveDisplayName(winnerId);
    showMessage(decoratedWinner, t('winsMessage'));

    const nextMatchBtn = document.getElementById('nextMatch');
    if (nextMatchBtn) {
      nextMatchBtn.classList.remove('hidden');

      nextMatchBtn.onclick = () => {
        /////////////////////////////////////////////////////// queue algo multiMode
        if("multiMode" == mode){
          // Eliminate loser and keep the winner
          const newQueue = queue.filter(
            (player) => player === winnerId || (player !== p1 && player !== p2)
          );
          // Move winner to the front
          const updatedQueue = [winnerId, ...newQueue.filter((p) => p !== winnerId)];
          renderGamePage(mode, updatedQueue, playerScores, settings);
        }
       else if("multiMode" != mode)  {
                const humanPlayer = queue[0]; // always the main player
                  let opponents : any;

                  if(mode === "singleplayer" || mode === "profile-singleplayer"){
                //  Get full AI list from localStorage
                const opponentSettings = JSON.parse(localStorage.getItem('opponent_settings') || '{}');
                 opponents = opponentSettings.aiName || [];
                  }
                  else
                    opponents = ["player 2"];

                // Find which opponent was just played
                const currentOpponentIndex = opponents.findIndex((ai: string) => ai === p2);

                // Calculate the next opponent in sequence 
                const nextIndex = currentOpponentIndex >= 0
                  ? (currentOpponentIndex + 1) % opponents.length
                  : 0;

                const nextOpponent = opponents[nextIndex];

                const updatedQueue = [humanPlayer, nextOpponent, ...opponents.filter((ai: string) => ai !== nextOpponent)];

                renderGamePage(mode, updatedQueue, playerScores, settings);
}
        
      };
    }
  }, settings, p1, p2, { p1: displayP1, p2: displayP2 });
}
