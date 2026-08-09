const app = document.getElementById("app");

const games = JSON.parse(localStorage.getItem("routine721_games") || "[]");

function saveGames() {
localStorage.setItem("routine721_games", JSON.stringify(games));
}

function stats(playerGames) {
const wins = playerGames.filter(g => g.result === "Win").length;
const losses = playerGames.filter(g => g.result === "Loss").length;
const draws = playerGames.filter(g => g.result === "Draw").length;
const total = playerGames.length;

return {
wins,
losses,
draws,
total,
rate: total ? ((wins + draws * 0.5) / total) * 100 : 0
};
}

function escapeHTML(value) {
return String(value ?? "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function render() {
const players = [...new Set(games.map(g => g.player).filter(Boolean))];
const totalStats = stats(games);

app.innerHTML = ` <div class="site">

```
  <header class="topbar">
    <div>
      <div class="kicker">WARHAMMER 40,000 · 11TH EDITION</div>
      <h1>ROUTINE 721</h1>
    </div>

    <div class="header-stat">
      <span>GROUP WIN RATE</span>
      <strong>${totalStats.rate.toFixed(1)}%</strong>
    </div>
  </header>

  <main>

    <section class="hero">
      <div>
        <div class="kicker">CAMPAIGN COMMAND</div>
        <h2>WAR ROOM</h2>
        <p>Track your group's battles, armies and win rates.</p>
      </div>
    </section>

    <section class="stats">

      <div class="stat-card">
        <span>BATTLES</span>
        <strong>${totalStats.total}</strong>
      </div>

      <div class="stat-card">
        <span>VICTORIES</span>
        <strong class="green">${totalStats.wins}</strong>
      </div>

      <div class="stat-card">
        <span>DEFEATS</span>
        <strong class="red">${totalStats.losses}</strong>
      </div>

      <div class="stat-card">
        <span>DRAWS</span>
        <strong class="gold">${totalStats.draws}</strong>
      </div>

    </section>

    <section class="grid">

      <div class="card">

        <h3>RECORD A BATTLE</h3>

        <form id="gameForm">

          <label>
            Player
            <input id="player" placeholder="Player name" required>
          </label>

          <label>
            Your Army
            <input id="army" placeholder="Space Marines" required>
          </label>

          <label>
            Opponent
            <input id="opponent" placeholder="Opponent name">
          </label>

          <label>
            Opponent Army
            <input id="enemyArmy" placeholder="Orks" required>
          </label>

          <label>
            Result
            <select id="result">
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Draw">Draw</option>
            </select>
          </label>

          <label>
            Date
            <input id="date" type="date" required>
          </label>

          <label class="full">
            Notes
            <textarea id="notes" placeholder="Battle notes..."></textarea>
          </label>

          <button class="button" type="submit">
            RECORD BATTLE
          </button>

        </form>

      </div>

      <div class="card">

        <h3>PLAYERS</h3>

        <div id="players">

          ${
            players.length
              ? players.map(player => {

                  const playerGames =
                    games.filter(g => g.player === player);

                  const s = stats(playerGames);

                  return `
                    <div class="player">

                      <div>
                        <strong>${escapeHTML(player)}</strong>

                        <div class="muted">
                          ${s.wins}W · ${s.losses}L · ${s.draws}D
                        </div>
                      </div>

                      <strong class="winrate">
                        ${s.rate.toFixed(1)}%
                      </strong>

                    </div>
                  `;

                }).join("")
              : `
                <div class="empty">
                  No battles recorded yet.
                </div>
              `
          }

        </div>

      </div>

    </section>

    <section class="card history">

      <h3>BATTLE HISTORY</h3>

      ${
        games.length
          ? `
            <div class="table-wrap">

              <table>

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Player</th>
                    <th>Army</th>
                    <th>Opponent</th>
                    <th>Enemy Army</th>
                    <th>Result</th>
                    <th></th>
                  </tr>

                </thead>

                <tbody>

                  ${games.slice().reverse().map((game, index) => `

                    <tr>

                      <td>${escapeHTML(game.date)}</td>

                      <td>${escapeHTML(game.player)}</td>

                      <td>${escapeHTML(game.army)}</td>

                      <td>${escapeHTML(game.opponent || "-")}</td>

                      <td>${escapeHTML(game.enemyArmy)}</td>

                      <td>

                        <span class="result ${game.result.toLowerCase()}">
                          ${escapeHTML(game.result)}
                        </span>

                      </td>

                      <td>

                        <button
                          class="delete"
                          data-index="${games.length - 1 - index}">
                          DELETE
                        </button>

                      </td>

                    </tr>

                  `).join("")}

                </tbody>

              </table>

            </div>
          `
          : `
            <div class="empty">
              Your battle history is empty.
            </div>
          `
      }

    </section>

  </main>

  <footer>
    ROUTINE 721 · WAR ROOM
  </footer>

</div>
```

`;

const form = document.getElementById("gameForm");

if (form) {
form.addEventListener("submit", addGame);
}

document.querySelectorAll(".delete").forEach(button => {

```
button.addEventListener("click", () => {

  const index = Number(button.dataset.index);

  if (confirm("Delete this battle?")) {

    games.splice(index, 1);

    saveGames();

    render();

  }

});
```

});

const date = document.getElementById("date");

if (date) {
date.value = new Date().toISOString().slice(0, 10);
}
}

function addGame(event) {

event.preventDefault();

const game = {

```
player: document.getElementById("player").value.trim(),

army: document.getElementById("army").value.trim(),

opponent: document.getElementById("opponent").value.trim(),

enemyArmy: document.getElementById("enemyArmy").value.trim(),

result: document.getElementById("result").value,

date: document.getElementById("date").value,

notes: document.getElementById("notes").value.trim()
```

};

games.push(game);

saveGames();

render();

}

render();
