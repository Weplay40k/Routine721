```javascript
/* =====================================================
   ROUTINE 721 - WAR ROOM
   ===================================================== */

const ROUTINE_SUPABASE_URL =
  "https://jbgwdxavydhtvoqpbfmj.supabase.co";

const ROUTINE_SUPABASE_KEY =
  "sb_publishable_Wt8h6fNelT6zrzf-Dm8FXw_cdSGylaz";

/*
  IMPORTANT:
  We call the client routineClient instead of supabase.
  This avoids the browser error:
  "redeclaration of non-configurable global property supabase"
*/

const routineClient =
  window.supabase.createClient(
    ROUTINE_SUPABASE_URL,
    ROUTINE_SUPABASE_KEY
  );


let currentUser = null;
let currentGroup = null;
let currentProfile = null;
let groupGames = [];
let groupProfiles = [];


/* =====================================================
   HELPERS
   ===================================================== */

function $(id) {
  return document.getElementById(id);
}


function show(id) {
  const element = $(id);

  if (element) {
    element.classList.remove("hidden");
  }
}


function hide(id) {
  const element = $(id);

  if (element) {
    element.classList.add("hidden");
  }
}


function setMessage(id, text, success = false) {

  const element = $(id);

  if (!element) return;

  element.textContent = text;

  element.className =
    success
      ? "message success"
      : "message";
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


function winRate(wins, games) {

  if (!games) {
    return 0;
  }

  return Math.round(
    (wins / games) * 100
  );
}


/* =====================================================
   AUTH SCREEN
   ===================================================== */

function showAuthScreen() {

  show("auth-screen");
  hide("main-screen");
}


function showMainScreen() {

  hide("auth-screen");
  show("main-screen");
}


/* =====================================================
   SIGN IN
   ===================================================== */

async function signIn() {

  const email =
    $("email")?.value.trim();

  const password =
    $("password")?.value;


  if (!email || !password) {

    setMessage(
      "auth-message",
      "Please enter your email and password."
    );

    return;
  }


  setMessage(
    "auth-message",
    "Signing in..."
  );


  try {

    const result =
      await routineClient.auth.signInWithPassword({
        email: email,
        password: password
      });


    if (result.error) {

      console.error(
        "Sign in error:",
        result.error
      );

      setMessage(
        "auth-message",
        result.error.message
      );

      return;
    }


    currentUser =
      result.data.user;


    setMessage(
      "auth-message",
      "Signed in successfully.",
      true
    );


    await startApp();

  } catch (error) {

    console.error(error);

    setMessage(
      "auth-message",
      "Sign in error: " +
      error.message
    );
  }
}


/* =====================================================
   CREATE ACCOUNT
   ===================================================== */

async function createAccount() {

  const email =
    $("email")?.value.trim();

  const password =
    $("password")?.value;


  if (!email || !password) {

    setMessage(
      "auth-message",
      "Please enter an email and password."
    );

    return;
  }


  if (password.length < 6) {

    setMessage(
      "auth-message",
      "Password must contain at least 6 characters."
    );

    return;
  }


  setMessage(
    "auth-message",
    "Creating account..."
  );


  try {

    const result =
      await routineClient.auth.signUp({
        email: email,
        password: password
      });


    if (result.error) {

      console.error(
        "Create account error:",
        result.error
      );

      setMessage(
        "auth-message",
        result.error.message
      );

      return;
    }


    /*
      Supabase may require email confirmation.
    */

    if (!result.data.session) {

      setMessage(
        "auth-message",
        "Account created! Check your email to confirm your account.",
        true
      );

      return;
    }


    currentUser =
      result.data.user;


    await startApp();

  } catch (error) {

    console.error(error);

    setMessage(
      "auth-message",
      "Account error: " +
      error.message
    );
  }
}


/* =====================================================
   LOG OUT
   ===================================================== */

async function logOut() {

  await routineClient.auth.signOut();

  currentUser = null;
  currentGroup = null;

  showAuthScreen();
}


/* =====================================================
   START APPLICATION
   ===================================================== */

async function startApp() {

  showMainScreen();

  await loadProfile();

  await loadGroup();

  setDefaultDate();
}


/* =====================================================
   LOAD PROFILE
   ===================================================== */

async function loadProfile() {

  if (!currentUser) {
    return;
  }


  try {

    const result =
      await routineClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();


    if (result.error) {

      console.error(
        "Profile error:",
        result.error
      );

      return;
    }


    currentProfile =
      result.data;


    if (currentProfile) {

      const name =
        currentProfile.display_name ||
        currentUser.email ||
        "Player";


      if ($("profile-name")) {

        $("profile-name").textContent =
          name;
      }
    }

  } catch (error) {

    console.error(
      "Profile loading error:",
      error
    );
  }
}


/* =====================================================
   LOAD GROUP
   ===================================================== */

async function loadGroup() {

  if (!currentUser) {
    return;
  }


  try {

    const result =
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
        .eq(
          "user_id",
          currentUser.id
        )
        .limit(1);


    if (result.error) {

      console.error(
        "Group error:",
        result.error
      );

      $("group-name").textContent =
        "GROUP ERROR";

      return;
    }


    if (!result.data || !result.data.length) {

      $("group-name").textContent =
        "NO GROUP";

      return;
    }


    currentGroup =
      result.data[0].groups;


    if ($("group-name")) {

      $("group-name").textContent =
        currentGroup.name;
    }


    await loadGames();

    await loadGroupProfiles();

    refreshAll();

  } catch (error) {

    console.error(
      "Group loading error:",
      error
    );
  }
}


/* =====================================================
   LOAD GAMES
   ===================================================== */

async function loadGames() {

  if (!currentGroup) {
    return;
  }


  const result =
    await routineClient
      .from("games")
      .select("*")
      .eq(
        "group_id",
        currentGroup.id
      )
      .order(
        "played_at",
        {
          ascending: false
        }
      );


  if (result.error) {

    console.error(
      "Games error:",
      result.error
    );

    groupGames = [];

    return;
  }


  groupGames =
    result.data || [];
}


/* =====================================================
   LOAD GROUP MEMBERS
   ===================================================== */

async function loadGroupProfiles() {

  if (!currentGroup) {
    return;
  }


  const result =
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
      .eq(
        "group_id",
        currentGroup.id
      );


  if (result.error) {

    console.error(
      "Members error:",
      result.error
    );

    groupProfiles = [];

    return;
  }


  groupProfiles =
    (result.data || [])
      .map(member => member.profiles)
      .filter(profile => profile);
}


/* =====================================================
   SAVE BATTLE
   ===================================================== */

async function saveBattle() {

  if (!currentUser) {

    setMessage(
      "battle-message",
      "You must be signed in."
    );

    return;
  }


  if (!currentGroup) {

    setMessage(
      "battle-message",
      "You need to join or create a group first."
    );

    return;
  }


  const playerFaction =
    $("player-faction")?.value.trim();

  const opponentName =
    $("opponent-name")?.value.trim();

  const opponentFaction =
    $("opponent-faction")?.value.trim();

  const result =
    $("result")?.value;

  const playerVP =
    Number(
      $("player-vp")?.value || 0
    );

  const opponentVP =
    Number(
      $("opponent-vp")?.value || 0
    );

  const mission =
    $("mission")?.value.trim();

  const eventName =
    $("event-name")?.value.trim();

  const playedAt =
    $("played-at")?.value;

  const notes =
    $("notes")?.value.trim();


  if (!playerFaction) {

    setMessage(
      "battle-message",
      "Enter your faction."
    );

    return;
  }


  if (!opponentName) {

    setMessage(
      "battle-message",
      "Enter your opponent."
    );

    return;
  }


  setMessage(
    "battle-message",
    "Saving battle..."
  );


  const insertResult =
    await routineClient
      .from("games")
      .insert({

        group_id:
          currentGroup.id,

        player_id:
          currentUser.id,

        player_faction:
          playerFaction,

        opponent_name:
          opponentName,

        opponent_faction:
          opponentFaction,

        result:
          result,

        player_vp:
          playerVP,

        opponent_vp:
          opponentVP,

        mission:
          mission,

        event_name:
          eventName,

        played_at:
          playedAt || null,

        notes:
          notes
      });


  if (insertResult.error) {

    console.error(
      "Save battle error:",
      insertResult.error
    );

    setMessage(
      "battle-message",
      insertResult.error.message
    );

    return;
  }


  setMessage(
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

  refreshAll();
}


/* =====================================================
   DASHBOARD
   ===================================================== */

function refreshDashboard() {

  if (!currentUser) {
    return;
  }


  const games =
    groupGames.filter(
      game =>
        game.player_id ===
        currentUser.id
    );


  const wins =
    games.filter(
      game =>
        game.result === "win"
    ).length;


  const losses =
    games.filter(
      game =>
        game.result === "loss"
    ).length;


  const draws =
    games.filter(
      game =>
        game.result === "draw"
    ).length;


  $("stat-games").textContent =
    games.length;

  $("stat-wins").textContent =
    wins;

  $("stat-losses").textContent =
    losses;

  $("stat-draws").textContent =
    draws;

  $("stat-winrate").textContent =
    winRate(
      wins,
      games.length
    ) + "%";


  renderLeaderboard();

  renderRecentGames();
}


/* =====================================================
   LEADERBOARD
   ===================================================== */

function renderLeaderboard() {

  const container =
    $("leaderboard");

  if (!container) {
    return;
  }


  const stats = {};


  groupGames.forEach(game => {

    const player =
      game.player_id;


    if (!stats[player]) {

      stats[player] = {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0
      };
    }


    stats[player].games++;


    if (game.result === "win") {
      stats[player].wins++;
    }

    if (game.result === "loss") {
      stats[player].losses++;
    }

    if (game.result === "draw") {
      stats[player].draws++;
    }
  });


  const rows =
    Object.entries(stats)
      .map(([id, stats]) => {

        const profile =
          groupProfiles.find(
            p => p.id === id
          );


        return {

          name:
            profile?.display_name ||
            "Unknown Player",

          games:
            stats.games,

          wins:
            stats.wins,

          losses:
            stats.losses,

          draws:
            stats.draws,

          rate:
            winRate(
              stats.wins,
              stats.games
            )
        };
      })
      .sort(
        (a, b) =>
          b.rate - a.rate
      );


  if (!rows.length) {

    container.innerHTML =
      `<p class="muted">
        No battles recorded yet.
      </p>`;

    return;
  }


  container.innerHTML =
    rows.map((player, index) => {

      return `
        <div class="player-row">

          <div>

            <div class="name">
              #${index + 1}
              ${escapeHTML(player.name)}
            </div>

            <div class="muted">
              ${player.games} games ·
              ${player.wins}W /
              ${player.losses}L /
              ${player.draws}D
            </div>

          </div>

          <strong>
            ${player.rate}%
          </strong>

        </div>
      `;

    }).join("");
}


/* =====================================================
   RECENT GAMES
   ===================================================== */

function renderRecentGames() {

  const container =
    $("recent-games");

  if (!container) {
    return;
  }


  const games =
    groupGames.slice(0, 10);


  if (!games.length) {

    container.innerHTML =
      `<p class="muted">
        No battles recorded yet.
      </p>`;

    return;
  }


  container.innerHTML =
    games.map(game => {

      const profile =
        groupProfiles.find(
          p =>
            p.id ===
            game.player_id
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
                "Player"
              )}

              vs

              ${escapeHTML(
                game.opponent_name ||
                "Opponent"
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

            ${String(
              game.result || ""
            ).toUpperCase()}

            <br>

            <small>
              ${game.player_vp ?? 0}
              -
              ${game.opponent_vp ?? 0}
            </small>

          </div>

        </div>
      `;

    }).join("");
}


/* =====================================================
   PLAYERS
   ===================================================== */

function refreshPlayers() {

  const container =
    $("players-list");

  if (!container) {
    return;
  }


  if (!groupProfiles.length) {

    container.innerHTML =
      `<div class="card">
        <p class="muted">
          No players found.
        </p>
      </div>`;

    return;
  }


  container.innerHTML =
    groupProfiles.map(profile => {

      const games =
        groupGames.filter(
          game =>
            game.player_id ===
            profile.id
        );


      const wins =
        games.filter(
          game =>
            game.result === "win"
        ).length;


      const losses =
        games.filter(
          game =>
            game.result === "loss"
        ).length;


      const draws =
        games.filter(
          game =>
            game.result === "draw"
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
              ${winRate(
                wins,
                games.length
              )}%
            </strong>

          </div>

        </div>
      `;

    }).join("");
}


/* =====================================================
   FACTIONS
   ===================================================== */

function refreshFactions() {

  const container =
    $("factions-list");

  if (!container) {
    return;
  }


  const factions = {};


  groupGames.forEach(game => {

    const faction =
      game.player_faction;


    if (!faction) {
      return;
    }


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
          b[1].games -
          a[1].games
      );


  if (!rows.length) {

    container.innerHTML =
      `<div class="card">
        <p class="muted">
          No faction data yet.
        </p>
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
              ${winRate(
                stat.wins,
                stat.games
              )}%
            </strong>

          </div>

        </div>
      `;

    }).join("");
}


/* =====================================================
   PROFILE
   ===================================================== */

function refreshProfile() {

  if (!currentUser) {
    return;
  }


  const games =
    groupGames.filter(
      game =>
        game.player_id ===
        currentUser.id
    );


  const wins =
    games.filter(
      game =>
        game.result === "win"
    ).length;


  const losses =
    games.filter(
      game =>
        game.result === "loss"
    ).length;


  const draws =
    games.filter(
      game =>
        game.result === "draw"
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
    winRate(
      wins,
      games.length
    ) + "%";
}


/* =====================================================
   REFRESH EVERYTHING
   ===================================================== */

function refreshAll() {

  refreshDashboard();

  refreshPlayers();

  refreshFactions();

  refreshProfile();
}


/* =====================================================
   NAVIGATION
   ===================================================== */

function openPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(section => {

      section.classList.add(
        "hidden"
      );

    });


  const selected =
    document.getElementById(
      page + "-page"
    );


  if (selected) {

    selected.classList.remove(
      "hidden"
    );
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


/* =====================================================
   DATE
   ===================================================== */

function setDefaultDate() {

  const input =
    $("played-at");

  if (!input) {
    return;
  }


  const now =
    new Date();


  const local =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() *
      60000
    );


  input.value =
    local
      .toISOString()
      .split("T")[0];
}


/* =====================================================
   INITIALISE
   ===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "ROUTINE 721 JavaScript loaded."
    );


    /*
      Button listeners are attached here.
    */

    const loginButton =
      $("login-btn");

    const signupButton =
      $("signup-btn");

    const logoutButton =
      $("logout-btn");

    const saveBattleButton =
      $("save-battle");


    if (loginButton) {

      loginButton.addEventListener(
        "click",
        signIn
      );

    } else {

      console.error(
        "LOGIN BUTTON NOT FOUND"
      );
    }


    if (signupButton) {

      signupButton.addEventListener(
        "click",
        createAccount
      );

    } else {

      console.error(
        "CREATE ACCOUNT BUTTON NOT FOUND"
      );
    }


    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        logOut
      );

    }


    if (saveBattleButton) {

      saveBattleButton.addEventListener(
        "click",
        saveBattle
      );

    }


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


    /*
      Check whether somebody is already logged in.
    */

    try {

      const sessionResult =
        await routineClient.auth.getSession();


      if (
        sessionResult.data &&
        sessionResult.data.session
      ) {

        currentUser =
          sessionResult.data.session.user;

        await startApp();

      } else {

        showAuthScreen();

      }

    } catch (error) {

      console.error(
        "Startup error:",
        error
      );

      showAuthScreen();
    }

  }
);


/* =====================================================
   AUTH STATE
   ===================================================== */

routineClient.auth.onAuthStateChange(
  (_event, session) => {

    if (session?.user) {

      currentUser =
        session.user;

    } else {

      currentUser =
        null;
    }

  }
);
```
