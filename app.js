```javascript
/* =========================================================
   ROUTINE 721
   WAR ROOM
   ========================================================= */

/*
   IMPORTANT:
   These are your existing Supabase details.
*/

const ROUTINE_SUPABASE_URL =
  "https://jbgwdxavydhtvoqpbfmj.supabase.co";

const ROUTINE_SUPABASE_KEY =
  "sb_publishable_Wt8h6fNelT6zrzf-Dm8FXw_cdSGylaz";


/*
   We deliberately use a different variable name here.

   This prevents the previous:
   "redeclaration of non-configurable global property supabase"
   error.
*/

const routineClient =
  window.supabase.createClient(
    ROUTINE_SUPABASE_URL,
    ROUTINE_SUPABASE_KEY
  );


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentGroup = null;
let currentProfile = null;
let groupGames = [];
let groupProfiles = [];


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function show(id) {
  $(id)?.classList.remove("hidden");
}


function hide(id) {
  $(id)?.classList.add("hidden");
}


function message(id, text, success = false) {

  const element = $(id);

  if (!element) return;

  element.textContent = text;
  element.className =
    success ? "message success" : "message";
}


function calculateWinRate(wins, games) {

  if (!games) return 0;

  return Math.round((wins / games) * 100);
}


function escapeHTML(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   AUTH
   ========================================================= */

async function checkSession() {

  const { data, error } =
    await routineClient.auth.getSession();

  if (error) {

    console.error(error);

    showAuth();

    return;
  }

  if (data.session) {

    currentUser = data.session.user;

    await startApplication();

  } else {

    showAuth();

  }
}


function showAuth() {

  show("auth-screen");
  hide("main-screen");
}


async function login() {

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {

    message(
      "auth-message",
      "Please enter your email and password."
    );

    return;
  }

  message(
    "auth-message",
    "Signing in..."
  );

  const { data, error } =
    await routineClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    message(
      "auth-message",
      error.message
    );

    return;
  }

  currentUser = data.user;

  await startApplication();
}


async function signup() {

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {

    message(
      "auth-message",
      "Please enter an email and password."
    );

    return;
  }

  if (password.length < 6) {

    message(
      "auth-message",
      "Password must be at least 6 characters."
    );

    return;
  }

  message(
    "auth-message",
    "Creating account..."
  );

  const { data, error } =
    await routineClient.auth.signUp({
      email,
      password
    });

  if (error) {

    message(
      "auth-message",
      error.message
    );

    return;
  }

  if (data.session) {

    currentUser = data.user;

    await startApplication();

  } else {

    message(
      "auth-message",
      "Account created. Check your email if confirmation is required.",
      true
    );
  }
}


async function logout() {

  await routineClient.auth.signOut();

  currentUser = null;
  currentGroup = null;

  showAuth();
}


/* =========================================================
   APPLICATION START
   ========================================================= */

async function startApplication() {

  hide("auth-screen");
  show("main-screen");

  await loadProfile();
  await loadGroup();

  setDefaultDate();
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

  if (!currentUser) return;

  const { data, error } =
    await routineClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) {

    console.error(
      "Could not load profile:",
      error
    );

    return;
  }

  currentProfile = data;

  if (data) {

    $("profile-name").textContent =
      data.display_name ||
      currentUser.email ||
      "Player";
  }
}


/* =========================================================
   GROUP
   ========================================================= */

async function loadGroup() {

  if (!currentUser) return;

  const { data, error } =
    await routineClient
      .from("group_members")
      .select(`
        group_id,
        role,
        groups (
          id,
          name,
          invite_code
        )
      `)
      .eq("user_id", currentUser.id)
      .limit(1);

  if (error) {

    console.error(
      "Could not load group:",
      error
    );

    $("group-name").textContent =
      "NO GROUP";

    return;
  }

  if (!data || !data.length) {

    $("group-name").textContent =
      "NO GROUP";

    return;
  }

  currentGroup = data[0].groups;

  $("group-name").textContent =
    currentGroup.name;

  await loadGames();
  await loadGroupProfiles();

  refreshDashboard();
  refreshPlayers();
  refreshFactions();
  refreshProfile();
}


async function loadGames() {

  if (!currentGroup) return;

  const { data, error } =
    await routineClient
      .from("games")
      .select("*")
      .eq("group_id", currentGroup.id)
      .order("played_at", {
        ascending: false
      });

  if (error) {

    console.error(
      "Could not load games:",
      error
    );

    groupGames = [];

    return;
  }

  groupGames = data || [];
}


async function loadGroupProfiles() {

  if (!currentGroup) return;

  const { data: members, error } =
    await routineClient
      .from("group_members")
      .select(`
        user_id,
        role,
        profiles (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq("group_id", currentGroup.id);

  if (error) {

    console.error(
      "Could not load members:",
      error
    );

    groupProfiles = [];

    return;
  }

  groupProfiles =
    (members || [])
      .map(member => member.profiles)
      .filter(Boolean);
}


/* =========================================================
   BATTLE
   ========================================================= */

function setDefaultDate() {

  const date = new Date();

  const localDate =
    new Date(
      date.getTime() -
      date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];

  if ($("played-at")) {
    $("played-at").value = localDate;
  }
}


async function saveBattle() {

  if (!currentUser) {

    message(
      "battle-message",
      "You must be signed in."
    );

    return;
  }

  if (!currentGroup) {

    message(
      "battle-message",
      "You need to be in a group first."
    );

    return;
  }

  const playerFaction =
    $("player-faction").value.trim();

  const opponentName =
    $("opponent-name").value.trim();

  const opponentFaction =
    $("opponent-faction").value.trim();

  const result =
    $("result").value;

  const playerVP =
    parseInt($("player-vp").value || "0", 10);

  const opponentVP =
    parseInt($("opponent-vp").value || "0", 10);

  const mission =
    $("mission").value.trim();

  const eventName =
    $("event-name").value.trim();

  const playedAt =
    $("played-at").value;

  const notes =
    $("notes").value.trim();


  if (!playerFaction) {

    message(
      "battle-message",
      "Please enter your faction."
    );

    return;
  }

  if (!opponentName) {

    message(
      "battle-message",
      "Please enter your opponent."
    );

    return;
  }


  message(
    "battle-message",
    "Saving battle..."
  );


  const { error } =
    await routineClient
      .from("games")
      .insert({

        group_id: currentGroup.id,

        player_id: currentUser.id,

        player_faction: playerFaction,

        opponent_name: opponentName,

        opponent_faction: opponentFaction,

        result: result,

        player_vp: playerVP,

        opponent_vp: opponentVP,

        mission: mission,

        event_name: eventName,

        played_at: playedAt || null,

        notes: notes

      });


  if (error) {

    console.error(error);

    message(
      "battle-message",
      "Could not save battle: " +
      error.message
    );

    return;
  }


  message(
    "battle-message",
    "BATTLE SAVED ✓",
    true
  );


  $("player-faction").value = "";
  $("opponent-name").value = "";
  $("opponent-faction").value = "";
  $("player-vp").value = "";
  $("opponent-vp").value = "";
  $("mission").value = "";
  $("event-name").value = "";
  $("notes").value = "";

  setDefaultDate();


  await loadGames();

  refreshDashboard();
  refreshPlayers();
  refreshFactions();
  refreshProfile();
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function refreshDashboard() {

  const myGames =
    groupGames.filter(
      game =>
        game.player_id === currentUser?.id
    );


  const wins =
    myGames.filter(
      game => game.result === "win"
    ).length;

  const losses =
    myGames.filter(
      game => game.result === "loss"
    ).length;

  const draws =
    myGames.filter(
      game => game.result === "draw"
    ).length;


  $("stat-games").textContent =
    myGames.length;

  $("stat-wins").textContent =
    wins;

  $("stat-losses").textContent =
    losses;

  $("stat-draws").textContent =
    draws;

  $("stat-winrate").textContent =
    calculateWinRate(
      wins,
      myGames.length
    ) + "%";


  renderLeaderboard();
  renderRecentGames();
}


function renderLeaderboard() {

  const container =
    $("leaderboard");

  if (!container) return;


  const stats = {};


  groupGames.forEach(game => {

    const playerId =
      game.player_id;

    if (!stats[playerId]) {

      stats[playerId] = {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
    }


    stats[playerId].games++;


    if (game.result === "win") {
      stats[playerId].wins++;
    }

    if (game.result === "loss") {
      stats[playerId].losses++;
    }

    if (game.result === "draw") {
      stats[playerId].draws++;
    }

  });


  const rows =
    Object.entries(stats)
      .map(([playerId, stat]) => {

        const profile =
          groupProfiles.find(
            p => p.id === playerId
          );

        return {

          name:
            profile?.display_name ||
            "Unknown Player",

          ...stat,

          winRate:
            calculateWinRate(
              stat.wins,
              stat.games
            )

        };
      })
      .sort(
        (a, b) =>
          b.winRate - a.winRate
      );


  if (!rows.length) {

    container.innerHTML =
      `<p class="muted">No battles recorded yet.</p>`;

    return;
  }


  container.innerHTML =
    rows.map((player, index) => {

      return `
        <div class="player-row">

          <div>
            <span class="name">
              #${index + 1}
              ${escapeHTML(player.name)}
            </span>

            <div class="muted">
              ${player.games} games ·
              ${player.wins}W /
              ${player.losses}L /
              ${player.draws}D
            </div>
          </div>

          <strong>
            ${player.winRate}%
          </strong>

        </div>
      `;

    }).join("");
}


function renderRecentGames() {

  const container =
    $("recent-games");

  if (!container) return;


  const recent =
    groupGames.slice(0, 10);


  if (!recent.length) {

    container.innerHTML =
      `<p class="muted">No battles recorded yet.</p>`;

    return;
  }


  container.innerHTML =
    recent.map(game => {

      const profile =
        groupProfiles.find(
          p => p.id === game.player_id
        );


      const resultClass =
        game.result === "win"
          ? "win"
          : game.result === "loss"
            ? "loss"
            : "draw";


      return `
        <div class="game-row">

          <div>

            <div class="name">
              ${escapeHTML(
                profile?.display_name ||
                "Unknown"
              )}
              vs
              ${escapeHTML(
                game.opponent_name ||
                "Unknown"
              )}
            </div>

            <div class="muted">
              ${escapeHTML(
                game.player_faction ||
                ""
              )}
              vs
              ${escapeHTML(
                game.opponent_faction ||
                ""
              )}
            </div>

          </div>

          <div class="${resultClass}">
            ${String(game.result || "").toUpperCase()}
            <br>
            <small>
              ${game.player_vp ?? 0} -
              ${game.opponent_vp ?? 0}
            </small>
          </div>

        </div>
      `;

    }).join("");
}


/* =========================================================
   PLAYERS
   ========================================================= */

function refreshPlayers() {

  const container =
    $("players-list");

  if (!container) return;


  if (!groupProfiles.length) {

    container.innerHTML =
      `<div class="card">
        <p class="muted">No players found.</p>
      </div>`;

    return;
  }


  container.innerHTML =
    groupProfiles.map(profile => {

      const games =
        groupGames.filter(
          game =>
            game.player_id === profile.id
        );


      const wins =
        games.filter(
          game => game.result === "win"
        ).length;

      const losses =
        games.filter(
          game => game.result === "loss"
        ).length;

      const draws =
        games.filter(
          game => game.result === "draw"
        ).length;


      return `
        <div class="card">

          <div class="player-row">

            <div>

              <div class="name">
                ${escapeHTML(
                  profile.display_name ||
                  "Player"
                )}
              </div>

              <div class="muted">
                ${games.length} games ·
                ${wins}W /
                ${losses}L /
                ${draws}D
              </div>

            </div>

            <strong>
              ${calculateWinRate(
                wins,
                games.length
              )}%
            </strong>

          </div>

        </div>
      `;

    }).join("");
}


/* =========================================================
   FACTIONS
   ========================================================= */

function refreshFactions() {

  const container =
    $("factions-list");

  if (!container) return;


  const factions = {};


  groupGames.forEach(game => {

    const faction =
      game.player_faction;

    if (!faction) return;


    if (!factions[faction]) {

      factions[faction] = {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
    }


    factions[faction].games++;


    if (game.result === "win") {
      factions[faction].wins++;
    }

    if (game.result === "loss") {
      factions[faction].losses++;
    }

    if (game.result === "draw") {
      factions[faction].draws++;
    }

  });


  const rows =
    Object.entries(factions)
      .sort(
        (a, b) =>
          b[1].games - a[1].games
      );


  if (!rows.length) {

    container.innerHTML =
      `<div class="card">
        <p class="muted">No faction data yet.</p>
      </div>`;

    return;
  }


  container.innerHTML =
    rows.map(([name, stat]) => {

      return `
        <div class="card">

          <div class="faction-row">

            <div>

              <div class="name">
                ${escapeHTML(name)}
              </div>

              <div class="muted">
                ${stat.games} games ·
                ${stat.wins}W /
                ${stat.losses}L /
                ${stat.draws}D
              </div>

            </div>

            <strong>
              ${calculateWinRate(
                stat.wins,
                stat.games
              )}%
            </strong>

          </div>

        </div>
      `;

    }).join("");
}


/* =========================================================
   PROFILE STATISTICS
   ========================================================= */

function refreshProfile() {

  if (!currentUser) return;


  const games =
    groupGames.filter(
      game =>
        game.player_id === currentUser.id
    );


  const wins =
    games.filter(
      game => game.result === "win"
    ).length;

  const losses =
    games.filter(
      game => game.result === "loss"
    ).length;

  const draws =
    games.filter(
      game => game.result === "draw"
    ).length;


  $("profile-games").textContent =
    games.length;

  $("profile-wins").textContent =
    wins;

  $("profile-losses").textContent =
    losses;

  $("profile-draws").textContent =
    draws;

  $("profile-winrate").textContent =
    calculateWinRate(
      wins,
      games.length
    ) + "%";
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function openPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(section => {
      section.classList.add("hidden");
    });


  const selected =
    document.getElementById(
      page + "-page"
    );

  if (selected) {
    selected.classList.remove("hidden");
  }


  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("login-btn")
      ?.addEventListener(
        "click",
        login
      );


    $("signup-btn")
      ?.addEventListener(
        "click",
        signup
      );


    $("logout-btn")
      ?.addEventListener(
        "click",
        logout
      );


    $("save-battle")
      ?.addEventListener(
        "click",
        saveBattle
      );


    document
      .querySelectorAll(".tab")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            openPage(
              button.dataset.page
            );

          }
        );

      });


    checkSession();

  }
);


/* =========================================================
   AUTH STATE
   ========================================================= */

routineClient.auth.onAuthStateChange(
  async (_event, session) => {

    if (session?.user) {

      currentUser = session.user;

    } else {

      currentUser = null;

    }

  }
);
```
