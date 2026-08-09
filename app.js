const app = document.getElementById("app");

let games = JSON.parse(localStorage.getItem("routine721_games") || "[]");

function saveGames() {
localStorage.setItem("routine721_games", JSON.stringify(games));
}

function getStats(list) {
const wins = list.filter(g => g.result === "Win").length;
const losses = list.filter(g => g.result === "Loss").length;
const draws = list.filter(g => g.result === "Draw").length;
const total = list.length;

const winRate = total
? ((wins + draws * 0.5) / total) * 100
: 0;

return { wins, losses, draws, total, winRate };
}

function clean(value) {
return String(value || "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function render() {

const groupStats = getStats(games);

const playerNames = [
...new Set(
games
.map(game => game.player)
.filter(Boolean)
)
];

app.innerHTML = `

```
<div class="site">

  <header class="topbar">

    <div>
      <div class="kicker">
        WARHAMMER 40,000 · 11TH EDITION
      </div>

      <h1>ROUTINE 721</h1>
    </div>

    <div class="header-stat">

      <span>GROUP WIN RATE</span>

      <strong>
        ${groupStats.winRate.toFixed(1)}%
      </strong>

    </div>

  </header>


  <main>

    <section class="hero">

      <div>

        <div class="kicker">
          CAMPAIGN COMMAND
        </div>

        <h2>WAR ROOM</h2>

        <p>
          The battle record for your gaming group.
        </p>

      </div>

    </section>


    <section class="stats">

      <div class="stat-card">
        <span>BATTLES</span>
        <strong>${groupStats.total}</strong>
      </div>

      <div class="stat-card">
        <span>VICTORIES</span>
        <strong class="green">${groupStats.wins}</strong>
      </div>

      <div class="stat-card">
        <span>DEFEATS</span>
        <strong class="red">${groupStats.losses}</strong>
      </div>

      <div class="stat-card">
        <span>DRAWS</span>
        <strong class="gold">${groupStats.draws}</strong>
      </div>

    </section>


    <section class="columns">


      <div class="card">

        <h2>RECORD BATTLE</h2>

        <form id="battleForm">

          <label>
            Player

            <input
              id="player"
              placeholder="Player name"
              required
            >

          </label>


          <label>
            Your Army

            <input
              id="army"
              placeholder="Space Marines"
              required
            >

          </label>


          <label>
            Opponent

            <input
              id="opponent"
              placeholder="Opponent name"
            >

          </label>


          <label>
            Opponent Army

            <input
              id="enemyArmy"
              placeholder="Orks"
              required
            >

          </label>


          <label>
            Result

            <select id="result">

              <option value="Win">
                Win
              </option>

              <option value="Loss">
                Loss
              </option>

              <option value="Draw">
                Draw
              </option>

            </select>

          </label>


          <label>
            Date

            <input
              id="date"
              type="date"
              required
            >

          </label>


          <label class="full">

            Mission

            <input
              id="mission"
              placeholder="Take and Hold"
            >

          </label>


          <label class="full">

            Notes

            <textarea
              id="notes"
              placeholder="Battle notes..."
            ></textarea>

          </label>


          <button
            class="button"
            type="submit"
          >
            RECORD BATTLE
          </button>

        </form>

      </div>



      <div class="card">

        <h2>PLAYERS</h2>

        <div id="players">

          ${
            playerNames.length

            ? playerNames.map(name => {

                const playerGames =
                  games.filter(
                    game => game.player === name
                  );

                const stats =
                  getStats(playerGames);

                return `

                  <div class="player">

                    <div>

                      <strong>
                        ${clean(name)}
                      </strong>

                      <div class="muted">
                        ${stats.wins}W ·
                        ${stats.losses}L ·
                        ${stats.draws}D
                      </div>

                    </div>

                    <strong class="winrate">
                      ${stats.winRate.toFixed(1)}%
                    </strong>

                  </div>

                `;

              }).join("")

            : `

              <div class="empty">

                No players yet.

                <br>

                Record your first battle.

              </div>

            `
          }

        </div>

      </div>

    </section>



    <section class="card history">

      <div class="history-header">

        <h2>BATTLE HISTORY</h2>

        <button
          id="clearGames"
          class="small-button"
        >
          CLEAR ALL
        </button>

      </div>


      ${
        games.length

        ? `

          <div class="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>DATE</th>
                  <th>PLAYER</th>
                  <th>ARMY</th>
                  <th>OPPONENT</th>
                  <th>ENEMY ARMY</th>
                  <th>RESULT</th>
                  <th></th>

                </tr>

              </thead>


              <tbody>

                ${games
                  .slice()
                  .reverse()
                  .map((game, reversedIndex) => {

                    const realIndex =
                      games.length -
                      1 -
                      reversedIndex;

                    return `

                      <tr>

                        <td>
                          ${clean(game.date)}
                        </td>

                        <td>
                          ${clean(game.player)}
                        </td>

                        <td>
                          ${clean(game.army)}
                        </td>

                        <td>
                          ${clean(
                            game.opponent || "-"
                          )}
                        </td>

                        <td>
                          ${clean(
                            game.enemyArmy
                          )}
                        </td>

                        <td>

                          <span
                            class="result ${game.result.toLowerCase()}"
                          >
                            ${clean(game.result)}
                          </span>

                        </td>

                        <td>

                          <button
                            class="delete"
                            data-index="${realIndex}"
                          >
                            DELETE
                          </button>

                        </td>

                      </tr>

                    `;

                  })
                  .join("")}

              </tbody>

            </table>

          </div>

        `

        : `

          <div class="empty">
            No battles recorded yet.
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

const form =
document.getElementById("battleForm");

form.addEventListener(
"submit",
addBattle
);

document
.querySelectorAll(".delete")
.forEach(button => {

```
  button.addEventListener(
    "click",
    () => {

      const index =
        Number(button.dataset.index);

      games.splice(index, 1);

      saveGames();

      render();

    }
  );

});
```

document
.getElementById("clearGames")
.addEventListener(
"click",
() => {

```
    if (
      confirm(
        "Delete ALL battle records?"
      )
    ) {

      games = [];

      saveGames();

      render();

    }

  }
);
```

document.getElementById("date").value =
new Date()
.toISOString()
.slice(0, 10);

}

function addBattle(event) {

event.preventDefault();

const battle = {

```
player:
  document
    .getElementById("player")
    .value
    .trim(),

army:
  document
    .getElementById("army")
    .value
    .trim(),

opponent:
  document
    .getElementById("opponent")
    .value
    .trim(),

enemyArmy:
  document
    .getElementById("enemyArmy")
    .value
    .trim(),

result:
  document
    .getElementById("result")
    .value,

date:
  document
    .getElementById("date")
    .value,

mission:
  document
    .getElementById("mission")
    .value
    .trim(),

notes:
  document
    .getElementById("notes")
    .value
    .trim()
```

};

games.push(battle);

saveGames();

render();

}

render();
