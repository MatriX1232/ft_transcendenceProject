import Rgtranslations from '../../../languages/RegistrationLanguages';
import {renderGamePage} from '../../../game/GamePage'
import {openGameSettingsModal} from '../../../game/Gmaesettings'
const currentLang: string | null = localStorage.getItem('lang');

// ----------------- Types -----------------
type AliasList = string[];
type Match = { player1: string; player2: string; winner: string };

// ----------------- API calls -----------------
async function fetchAliasQueue(): Promise<AliasList> {
  const res = await fetch('http://localhost:3101/players');
  if (!res.ok) throw new Error('Failed to fetch alias queue');
  return res.json();
}

async function addPlayer(alias: string): Promise<void> {
  const res = await fetch('http://localhost:3101/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias }),
  });

  if (!res.ok && res.status !== 409) {
    throw new Error(`Failed to save alias: ${alias}`);
  }
}

async function fetchMatchHistory(): Promise<Match[]> {
  const res = await fetch('http://localhost:3102/matches');
  if (!res.ok) throw new Error('Failed to fetch match history');
  return res.json();
}

async function resetTournamentDB(): Promise<void> {
  const res = await fetch('http://localhost:3101/players', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to reset tournament');
   
  const matchdel = await fetch('http://localhost:3102/matches', { method: 'DELETE' });
  if (!matchdel.ok) throw new Error('Failed to reset tournament');
}

// ----------------- Helpers -----------------
function t(key: keyof typeof Rgtranslations["eng"]): string {
  const lang = (currentLang as keyof typeof Rgtranslations) || 'eng';
  return Rgtranslations[lang]?.[key] || Rgtranslations['eng'][key];
}

function getInitials(name: string | undefined) {
  if (!name) return 'P';
  return name
    .split(/[\s-]/)
    .map((part) => part[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');
}

// ----------------- Main Renderer -----------------
export async function renderRegistrationPage() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `<p class="text-white text-center mt-20">Loading...</p>`;

  try {
    const queue: AliasList = await fetchAliasQueue();
    const matchHistory = await fetchMatchHistory();

    function getWinCount(alias: string): number {
      return matchHistory.filter((m) => m.winner === alias).length;
    }

    app.innerHTML = `
    <div class="h-screen w-screen p-8 bg-gradient-to-br from-purple-900 via-black to-blue-900 text-white font-sans flex flex-col md:flex-row gap-10">
      <!-- LEFT PANEL -->
      <section class="flex-1 rounded-xl p-8 shadow-lg">
        <div class="my-10">
          <button onclick="location.href='/guestmode'" class="hover:border-white/40 px-4 py-2 flex justify-center items-center backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
</svg>
          </button>
        </div>

        <div>
          <h1 class="text-4xl font-semibold mb-6 border-b border-gray-700 pb-3">${t('registration')}</h1>
          <div class="flex gap-4 mb-6">
            <input type="text" id="alias" placeholder="${t('enterAlias')}" 
              class="flex-grow px-4 py-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600 bg-transparent" />
            <button id="addBtn" 
              class="px-6 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-semibold shadow-md transition">
              ${t('addPlayer')}
            </button>
          </div>

          <div class="flex gap-4">
            <button id="startGame" 
              class="flex-1 py-3 bg-purple-500 hover:bg-purple-700 rounded-lg font-bold shadow-md transition">
              ${t('startTournament')}
            </button>
              <button id="settingsbtn" 
              class="flex-1 py-3 bg-purple-500 hover:bg-purple-700 rounded-lg font-bold shadow-md transition">
              ${t('settings')}
            </button>
            <button id="resetBtn" 
              class="flex-1 py-3 bg-purple-800 hover:bg-purple-900 rounded-lg font-bold shadow-md transition">
              ${t('resetTournament')}
            </button>
          </div>
        </div>
      </section>

      <!-- RIGHT PANEL -->
      <section class="flex-1 rounded-2xl p-10 shadow-lg flex flex-col backdrop-blur-xl bg-white/10 border border-white/20">
        <h2 class="text-3xl font-semibold mb-6 border-b border-gray-700 pb-3">${t('players')} (${queue.length})</h2>
        <ul class="flex flex-col gap-3 max-h-64 overflow-y-auto mb-8 pr-2">
          ${queue.sort().map((alias) => `
            <li class="flex items-center gap-4 bg-gray-800 rounded-lg px-4 py-2 shadow-md hover:bg-gray-600 transition">
              <div class="w-12 h-12 rounded-full bg-purple-800 flex items-center justify-center text-white font-bold text-lg select-none">
                ${getInitials(alias)}
              </div>
              <div class="flex flex-col">
                <span class="font-semibold">${alias}</span>
                <span class="text-pink-500 text-sm">${t('wins')}: ${getWinCount(alias)}</span>
              </div>
            </li>
          `).join('')}
        </ul>

        <h2 class="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">${t('matchHistory')}</h2>
        <ul class="flex-1 overflow-y-auto text-gray-300 text-sm pr-2 space-y-1">
          ${matchHistory.length > 0 
            ? matchHistory.map((m, i) => `
              <li>
                <strong>${t('match')} ${i + 1}:</strong> 
                <span class="text-blue-400">${m.player1}</span> ${t('vs')} 
                <span class="text-pink-400">${m.player2}</span> — 
                ${t('winner')}: <span class="text-green-400">${m.winner}</span>
              </li>
            `).join('')
            : `<li class="italic">${t('noMatches')}</li>`
          }
        </ul>
      </section>
    </div>
    `;

    // ----------------- Event listeners -----------------
    document.getElementById('addBtn')?.addEventListener('click', async () => {
      const input = document.getElementById('alias') as HTMLInputElement;
      const alias = input?.value.trim();

      if (!alias) {
        alert(t('enterAliasAlert'));
        return;
      }
      if (queue.includes(alias)) {
        alert(t('aliasExistsAlert'));
        return;
      }

      try {
        await addPlayer(alias);
        await renderRegistrationPage();
      } catch (err) {
        console.error(err);
        alert((err as Error).message);
      }
    });

document.getElementById('startGame')?.addEventListener('click', async () => {
  if (queue.length < 2) {
    alert(t('needPlayersAlert'));
    return;
  }
  await renderGamePage("multiMode" , queue);
});

    document.getElementById('resetBtn')?.addEventListener('click', async () => {
      if (confirm(t('resetConfirm'))) {
        await resetTournamentDB();
        await renderRegistrationPage();
      }
    });
        document.getElementById('settingsbtn')?.addEventListener('click', async () => {
    const username = localStorage.getItem('username') || 'guest';
    openGameSettingsModal(username);
});

    /// game mode
    const mode = "multi";
    localStorage.setItem('mode' , mode);

  } catch (error) {
    app.innerHTML = `<p class="text-red-500 text-center mt-20">${t('errorLoading')}: ${(error as Error).message}</p>`;
    console.error(error);
  }
}

