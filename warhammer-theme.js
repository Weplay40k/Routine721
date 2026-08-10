/* Routine 721 — War Room features layer
   Adds profile faction categories, automatic faction statistics,
   opponent allegiance selection, safe delete controls, and leaderboard ranking. */
(function () {
    "use strict";
    const CATEGORY_VALUES = ["Imperium", "Chaos", "Xenos"];
    const MIN_LEADERBOARD_GAMES = 3;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function getCategoryFromFaction(faction) {
        const value = String(faction || "").trim().toLowerCase();
        if (!value) return null;
        const chaos = ["chaos", "death guard", "thousand sons", "world eaters", "emperor's children", "emperors children", "chaos daemons", "chaos daemon", "chaos knights", "daemon prince"];
        const imperium = ["imperium", "space marine", "ultramarine", "blood angel", "dark angel", "space wolf", "black templar", "deathwatch", "imperial fist", "salamander", "raven guard", "white scar", "iron hand", "grey knight", "adepta sororitas", "sisters of battle", "adeptus custodes", "custodes", "astra militarum", "imperial guard", "imperial knight", "knight", "adeptus mechanicus", "mechanicus", "sisters of silence"];
        const xenos = ["xenos", "ork", "orks", "eldar", "aeldari", "drukhari", "dark eldar", "tyranid", "tyranids", "genestealer", "tau", "t'au", "necron", "necrons", "leagues of votann", "votann"];
        if (chaos.some(k => value.includes(k))) return "Chaos";
        if (imperium.some(k => value.includes(k))) return "Imperium";
        if (xenos.some(k => value.includes(k))) return "Xenos";
        return null;
    }

    async function prepareProfileFaction() {
        const armies = document.getElementById("profileArmies");
        if (!armies || !currentUser) return;
        if (!document.getElementById("r721FactionCategoryGroup")) {
            armies.insertAdjacentHTML("afterend", `
                <div class="form-group" id="r721FactionCategoryGroup">
                    <label for="profileMainFaction">Faction Allegiance</label>
                    <select id="profileMainFaction">
                        <option value="">SELECT YOUR GRAND ALLIANCE</option>
                        <option value="Imperium">IMPERIUM</option>
                        <option value="Chaos">CHAOS</option>
                        <option value="Xenos">XENOS</option>
                    </select>
                    <div class="r721-faction-help">This allegiance controls which faction war record receives your match results.</div>
                </div>
            `);
        }
        const select = document.getElementById("profileMainFaction");
        if (!select) return;
        const { data, error } = await supabaseClient.from("profiles")
            .select("main_faction, main_army").eq("id", currentUser.id).maybeSingle();
        if (error) { console.warn("Faction profile:", error.message); return; }
        select.value = data?.main_faction || getCategoryFromFaction(data?.main_army) || "";
    }

    function prepareMatchOpponentFaction() {
        const input = document.getElementById("matchOpponentFaction");
        if (!input || input.dataset.r721Prepared === "true") return;
        const select = document.createElement("select");
        select.id = "matchOpponentFaction";
        select.dataset.r721Prepared = "true";
        select.innerHTML = `
            <option value="">SELECT OPPONENT ALLEGIANCE</option>
            <option value="Imperium">IMPERIUM</option>
            <option value="Chaos">CHAOS</option>
            <option value="Xenos">XENOS</option>
        `;
        input.replaceWith(select);
        const label = document.querySelector('label[for="matchOpponentFaction"]');
        if (label) label.textContent = "Opponent Allegiance";
    }

    async function saveFactionCategory() {
        const select = document.getElementById("profileMainFaction");
        if (!select || !currentUser) return false;
        const category = select.value;
        if (!CATEGORY_VALUES.includes(category)) return false;
        const { error } = await supabaseClient.from("profiles")
            .update({ main_faction: category }).eq("id", currentUser.id);
        if (error) { setProfileStatus(error.message, "error"); return false; }
        return true;
    }

    async function loadProfileCategoryMap(playerIds) {
        const map = {};
        if (!playerIds.length) return map;
        const { data, error } = await supabaseClient.from("profiles")
            .select("id, main_faction, main_army").in("id", playerIds);
        if (error) { console.error("Faction profiles:", error); return map; }
        (data || []).forEach(profile => {
            map[profile.id] = profile.main_faction || getCategoryFromFaction(profile.main_army);
        });
        return map;
    }

    async function loadFactionStatsByProfile() {
        const statsContainer = document.getElementById("factionStatsList");
        const detailsContainer = document.getElementById("factionDetailsList");
        if (!statsContainer || !detailsContainer || !currentUser) return;
        statsContainer.innerHTML = '<div class="empty">CALCULATING FACTION WAR RECORDS...</div>';
        detailsContainer.innerHTML = "";
        const { data: games, error } = await supabaseClient.from("games")
            .select("id, player_id, player_faction, opponent_faction, result, player_vp, played_at");
        if (error) { statsContainer.innerHTML = `<div class="empty">Could not load faction statistics: ${escapeHtml(error.message)}</div>`; return; }
        const playerIds = [...new Set((games || []).map(game => game.player_id).filter(Boolean))];
        const categoriesByPlayer = await loadProfileCategoryMap(playerIds);
        const categories = { Chaos: { played: 0, wins: 0, losses: 0, draws: 0, totalVP: 0, vpGames: 0 }, Xenos: { played: 0, wins: 0, losses: 0, draws: 0, totalVP: 0, vpGames: 0 }, Imperium: { played: 0, wins: 0, losses: 0, draws: 0, totalVP: 0, vpGames: 0 } };
        const factionRows = {};
        (games || []).forEach(game => {
            const playerCategory = categoriesByPlayer[game.player_id];
            const opponentCategory = CATEGORY_VALUES.includes(game.opponent_faction) ? game.opponent_faction : getCategoryFromFaction(game.opponent_faction);
            const result = String(game.result || "").toLowerCase();
            if (CATEGORY_VALUES.includes(playerCategory)) {
                const item = categories[playerCategory]; item.played++;
                if (result === "win") item.wins++; else if (result === "loss") item.losses++; else item.draws++;
                if (game.player_vp !== null && game.player_vp !== undefined && game.player_vp !== "") { item.totalVP += Number(game.player_vp) || 0; item.vpGames++; }
                const faction = String(game.player_faction || "").trim();
                if (faction) { if (!factionRows[faction]) factionRows[faction] = { played: 0, wins: 0, losses: 0, draws: 0, category: playerCategory }; const row = factionRows[faction]; row.played++; if (result === "win") row.wins++; else if (result === "loss") row.losses++; else row.draws++; }
            }
            if (CATEGORY_VALUES.includes(opponentCategory)) { const opponent = categories[opponentCategory]; opponent.played++; if (result === "win") opponent.losses++; else if (result === "loss") opponent.wins++; else opponent.draws++; }
        });
        statsContainer.innerHTML = CATEGORY_VALUES.map(category => { const item = categories[category]; const winRate = item.played ? Math.round((item.wins / item.played) * 100) : 0; const averageVP = item.vpGames ? Math.round((item.totalVP / item.vpGames) * 10) / 10 : 0; return `<div class="faction-stat-card"><div class="faction-stat-name">${category.toUpperCase()}</div><div class="faction-stat-rate">${winRate}%</div><div class="faction-stat-meta">${item.played} games · ${item.wins}W · ${item.losses}L · ${item.draws}D<br>Average VP: ${averageVP}</div><div class="faction-stat-bar"><span style="width:${winRate}%"></span></div></div>`; }).join("");
        const sorted = Object.entries(factionRows).sort((a, b) => { const aRate = a[1].played ? a[1].wins / a[1].played : 0; const bRate = b[1].played ? b[1].wins / b[1].played : 0; return (bRate - aRate) || (b[1].played - a[1].played) || a[0].localeCompare(b[0]); });
        detailsContainer.innerHTML = sorted.length ? `<div class="faction-detail-row faction-detail-header"><div>FACTION</div><div>GAMES</div><div>WINS</div><div>LOSSES</div><div>WIN RATE</div></div>${sorted.map(([faction, item]) => { const rate = item.played ? Math.round((item.wins / item.played) * 100) : 0; return `<div class="faction-detail-row"><div>${escapeHtml(faction)} <span class="r721-category-chip">${escapeHtml(item.category)}</span></div><div>${item.played}</div><div>${item.wins}</div><div>${item.losses}</div><div>${rate}%</div></div>`; }).join("")}` : '<div class="empty">No matches belong to a player with a faction allegiance yet.</div>';
    }

    async function deleteMatch(gameId) {
        if (!gameId || !currentUser) return;
        if (!window.confirm("DELETE THIS BATTLE RECORD? This cannot be undone.")) return;
        const { error } = await supabaseClient.from("games").delete().eq("id", gameId);
        if (error) { alert("Could not delete the match: " + error.message); return; }
        document.getElementById("detailsModal")?.classList.add("hidden");
        await loadMatches(); await loadRecentMatches(); await updateStats(); await loadFactionStatsByProfile();
    }

    function canDeleteGroup(group) { return !!currentUser && group?.created_by === currentUser.id; }
    async function deleteGroup(groupId) {
        const group = currentGroups.find(item => item.id === groupId); if (!group || !canDeleteGroup(group)) return;
        if (!window.confirm(`DELETE "${group.name}"? All matches and memberships in this group will also be deleted.`)) return;
        const { error } = await supabaseClient.from("groups").delete().eq("id", groupId);
        if (error) { alert("Could not delete the group: " + error.message); return; }
        if (selectedGroupId === groupId) { selectedGroupId = null; selectedGroup = null; }
        await loadGroups(); await loadMatches(); await loadRecentMatches(); await updateStats(); await loadFactionStatsByProfile();
    }

    function addGroupDeleteControls() { document.querySelectorAll("[data-group-id]").forEach(card => { if (card.querySelector(".r721-delete-group")) return; const group = currentGroups.find(item => item.id === card.dataset.groupId); if (!canDeleteGroup(group)) return; const button = document.createElement("button"); button.type = "button"; button.className = "r721-delete-group small-button"; button.textContent = "DELETE GROUP"; button.dataset.groupId = card.dataset.groupId; button.addEventListener("click", event => { event.stopPropagation(); deleteGroup(button.dataset.groupId); }); card.appendChild(button); }); }
    function addMatchDeleteButton() { const buttons = document.querySelector("#detailsModal .modal-buttons"); if (!buttons || document.getElementById("r721DeleteMatchButton")) return; const button = document.createElement("button"); button.id = "r721DeleteMatchButton"; button.type = "button"; button.className = "secondary-button r721-danger-button"; button.textContent = "DELETE BATTLE"; button.addEventListener("click", () => deleteMatch(button.dataset.gameId)); buttons.insertBefore(button, buttons.firstChild); }
    async function waitForGroupCards() { for (let i = 0; i < 30; i++) { addGroupDeleteControls(); if (document.querySelector("[data-group-id]")) return; await new Promise(resolve => requestAnimationFrame(resolve)); } }

    function installLeaderboardRanking() {
        if (typeof supabaseClient === "undefined" || typeof getPlayerStatistics !== "function") return;
        window.loadLeaderboard = async function () {
            const container = document.getElementById("leaderboardList"); if (!container) return;
            container.innerHTML = '<div class="empty">CALCULATING COMMANDER RANKINGS...</div>';
            const { data: profiles, error } = await supabaseClient.from("profiles").select("id, display_name, avatar_url, main_army").order("display_name", { ascending: true });
            if (error) { container.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`; return; }
            const stats = await getPlayerStatistics(profiles || []);
            const players = (profiles || []).map(player => ({ player, stats: stats[player.id] || { played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 } }));
            const ranked = players.filter(item => item.stats.played >= MIN_LEADERBOARD_GAMES).sort((a, b) => (b.stats.winRate - a.stats.winRate) || (b.stats.wins - a.stats.wins) || (b.stats.played - a.stats.played) || String(a.player.display_name || "").localeCompare(String(b.player.display_name || "")));
            const unranked = players.filter(item => item.stats.played < MIN_LEADERBOARD_GAMES).sort((a, b) => (b.stats.played - a.stats.played) || (b.stats.winRate - a.stats.winRate) || String(a.player.display_name || "").localeCompare(String(b.player.display_name || "")));
            const card = (item, index, qualified) => { const player = item.player; const s = item.stats; const title = qualified ? `#${index + 1}` : "UNRANKED"; const requirement = qualified ? `${s.played} GAMES — QUALIFIED` : `${s.played}/${MIN_LEADERBOARD_GAMES} GAMES — NEED ${Math.max(0, MIN_LEADERBOARD_GAMES - s.played)} MORE`; return `<div class="player-card ${qualified ? "r721-ranked-card" : "r721-unranked-card"}" data-leader-player="${escapeHtml(player.id)}"><div class="player-card-top">${avatarHtml(player)}<div><div class="player-card-name">${title}&nbsp; ${escapeHtml(player.display_name || "Battle-brother")}</div><div class="player-card-army">${escapeHtml(player.main_army || "NO MAIN ARMY")}</div></div></div><div class="player-stats-mini"><div class="mini-stat"><div class="mini-stat-number">${s.played}</div><div class="mini-stat-label">GAMES</div></div><div class="mini-stat"><div class="mini-stat-number">${s.wins}</div><div class="mini-stat-label">WINS</div></div><div class="mini-stat"><div class="mini-stat-number">${s.winRate}%</div><div class="mini-stat-label">WIN RATE</div></div></div><div class="r721-ranking-status">${requirement}</div></div>`; };
            if (!players.length) { container.innerHTML = '<div class="empty">No players yet.</div>'; return; }
            container.innerHTML = `<div class="r721-leaderboard-rule">RANKED BY WIN RATE · MINIMUM ${MIN_LEADERBOARD_GAMES} GAMES</div>${ranked.map((item, index) => card(item, index, true)).join("")}${unranked.length ? `<div class="r721-unranked-heading">COMMANDERS BELOW MINIMUM GAMES</div>${unranked.map(item => card(item, 0, false)).join("")}` : ""}`;
            container.querySelectorAll("[data-leader-player]").forEach(cardEl => cardEl.addEventListener("click", () => loadPlayerProfile(cardEl.dataset.leaderPlayer)));
        };
    }

    function wireDynamicUi() {
        const profileNav = document.querySelector('.nav-button[data-page="profile"]'); if (profileNav) profileNav.addEventListener("click", () => prepareProfileFaction());
        const recordButton = document.getElementById("recordMatchButton"); if (recordButton) recordButton.addEventListener("click", () => setTimeout(prepareMatchOpponentFaction, 0)); prepareMatchOpponentFaction();
        const factionNav = document.querySelector('.nav-button[data-page="factions"]'); if (factionNav) factionNav.addEventListener("click", event => { event.preventDefault(); event.stopImmediatePropagation(); showPage("factions"); loadFactionStatsByProfile(); }, true);
        const groupsNav = document.querySelector('.nav-button[data-page="groups"]'); if (groupsNav) groupsNav.addEventListener("click", () => waitForGroupCards());
        const matchesList = document.getElementById("matchesList"); if (matchesList) matchesList.addEventListener("click", event => { const row = event.target.closest(".match-row"); if (!row) return; const game = currentGames.find(item => item.id === row.dataset.gameId); if (!game) return; queueMicrotask(() => { addMatchDeleteButton(); const button = document.getElementById("r721DeleteMatchButton"); if (button) button.dataset.gameId = game.id; }); });
        const modalConfirm = document.getElementById("modalConfirm"); if (modalConfirm) modalConfirm.addEventListener("click", event => { const matchForm = document.getElementById("matchForm"); if (!matchForm || matchForm.classList.contains("hidden")) return; event.preventDefault(); event.stopImmediatePropagation(); const select = document.getElementById("profileMainFaction"); if (!select || !CATEGORY_VALUES.includes(select.value)) { setModalStatus("Set your Faction Allegiance in MY PROFILE before recording a match.", "error"); return; } const opponentFaction = document.getElementById("matchOpponentFaction"); if (!opponentFaction || !CATEGORY_VALUES.includes(opponentFaction.value)) { setModalStatus("Select the opponent's allegiance: Imperium, Chaos or Xenos.", "error"); return; } recordMatch().then(() => loadFactionStatsByProfile()); }, true);
        const saveButton = document.getElementById("saveProfileButton"); if (saveButton) { saveButton.addEventListener("click", event => { const select = document.getElementById("profileMainFaction"); if (!select || !CATEGORY_VALUES.includes(select.value)) { event.preventDefault(); event.stopImmediatePropagation(); setProfileStatus("Select Imperium, Chaos or Xenos before saving your profile.", "error"); } }, true); saveButton.addEventListener("click", async () => { await saveFactionCategory(); }); }
    }

    function addFactionStyles() { if (document.getElementById("r721-feature-styles")) return; const style = document.createElement("style"); style.id = "r721-feature-styles"; style.textContent = `.r721-faction-help{margin-top:6px;color:#77705f;font-size:8px;line-height:1.5}.r721-category-chip{display:inline-block;margin-left:6px;padding:2px 5px;border:1px solid #4d4128;color:#b9964d;font-size:7px;letter-spacing:.6px}.r721-delete-group{margin-top:12px;border-color:#6f3028!important;color:#d18b7b!important}.r721-danger-button{border-color:#7d3028!important;color:#d18b7b!important}#r721FactionCategoryGroup select,#matchOpponentFaction{width:100%}.r721-leaderboard-rule{margin-bottom:12px;padding:10px 12px;border:1px solid #3d3321;background:#11100d;color:#b9964d;font-size:8px;font-weight:700;letter-spacing:1.2px}.r721-ranking-status{margin-top:10px;color:#8f8a7a;font-size:8px;letter-spacing:.7px}.r721-unranked-heading{margin:24px 0 10px;padding-top:14px;border-top:1px solid #292933;color:#666672;font-size:8px;font-weight:700;letter-spacing:1.5px}.r721-unranked-card{opacity:.72}`; document.head.appendChild(style); }

    document.addEventListener("DOMContentLoaded", () => { addFactionStyles(); installLeaderboardRanking(); wireDynamicUi(); addMatchDeleteButton(); prepareProfileFaction(); prepareMatchOpponentFaction(); addGroupDeleteControls(); waitForGroupCards(); setTimeout(addGroupDeleteControls, 1000); });
})();
