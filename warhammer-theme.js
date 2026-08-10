/* Routine 721 — War Room features layer
   Adds profile faction categories, automatic faction statistics,
   and safe delete controls without modifying the core app logic. */

(function () {
    "use strict";

    const CATEGORY_VALUES = ["Imperium", "Chaos", "Xenos"];

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("main_faction, main_army")
            .eq("id", currentUser.id)
            .maybeSingle();

        if (error) {
            console.warn("Faction profile:", error.message);
            return;
        }

        select.value = data?.main_faction || getCategoryFromFaction(data?.main_army) || "";
    }

    async function saveFactionCategory() {
        const select = document.getElementById("profileMainFaction");
        if (!select || !currentUser) return false;
        const category = select.value;
        if (!CATEGORY_VALUES.includes(category)) return false;

        const { error } = await supabaseClient
            .from("profiles")
            .update({ main_faction: category })
            .eq("id", currentUser.id);

        if (error) {
            setProfileStatus(error.message, "error");
            return false;
        }
        return true;
    }

    async function loadProfileCategoryMap(playerIds) {
        const map = {};
        if (!playerIds.length) return map;

        const { data, error } = await supabaseClient
            .from("profiles")
            .select("id, main_faction, main_army")
            .in("id", playerIds);

        if (error) {
            console.error("Faction profiles:", error);
            return map;
        }

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

        const { data: games, error } = await supabaseClient
            .from("games")
            .select("id, player_id, player_faction, result, player_vp, played_at");

        if (error) {
            statsContainer.innerHTML = `<div class="empty">Could not load faction statistics: ${escapeHtml(error.message)}</div>`;
            return;
        }

        const playerIds = [...new Set((games || []).map(game => game.player_id).filter(Boolean))];
        const categoriesByPlayer = await loadProfileCategoryMap(playerIds);

        const categories = {
            Chaos: { played: 0, wins: 0, losses: 0, draws: 0, totalVP: 0, vpGames: 0 },
            Xenos: { played: 0, wins: 0, losses: 0, draws: 0, totalVP: 0, vpGames: 0 },
            Imperium: { played: 0, wins: 0, losses: 0, draws: 0, totalVP: 0, vpGames: 0 }
        };

        const factionRows = {};

        (games || []).forEach(game => {
            const category = categoriesByPlayer[game.player_id];
            if (!CATEGORY_VALUES.includes(category)) return;

            const item = categories[category];
            item.played++;
            const result = String(game.result || "").toLowerCase();
            if (result === "win") item.wins++;
            else if (result === "loss") item.losses++;
            else item.draws++;

            if (game.player_vp !== null && game.player_vp !== undefined && game.player_vp !== "") {
                item.totalVP += Number(game.player_vp) || 0;
                item.vpGames++;
            }

            const faction = String(game.player_faction || "").trim();
            if (faction) {
                if (!factionRows[faction]) factionRows[faction] = { played: 0, wins: 0, losses: 0, draws: 0, category };
                const row = factionRows[faction];
                row.played++;
                if (result === "win") row.wins++;
                else if (result === "loss") row.losses++;
                else row.draws++;
            }
        });

        statsContainer.innerHTML = CATEGORY_VALUES.map(category => {
            const item = categories[category];
            const winRate = item.played ? Math.round((item.wins / item.played) * 100) : 0;
            const averageVP = item.vpGames ? Math.round((item.totalVP / item.vpGames) * 10) / 10 : 0;
            return `
                <div class="faction-stat-card">
                    <div class="faction-stat-name">${category.toUpperCase()}</div>
                    <div class="faction-stat-rate">${winRate}%</div>
                    <div class="faction-stat-meta">${item.played} games · ${item.wins}W · ${item.losses}L · ${item.draws}D<br>Average VP: ${averageVP}</div>
                    <div class="faction-stat-bar"><span style="width:${winRate}%"></span></div>
                </div>
            `;
        }).join("");

        const sorted = Object.entries(factionRows).sort((a, b) => {
            const aRate = a[1].played ? a[1].wins / a[1].played : 0;
            const bRate = b[1].played ? b[1].wins / b[1].played : 0;
            return (bRate - aRate) || (b[1].played - a[1].played) || a[0].localeCompare(b[0]);
        });

        detailsContainer.innerHTML = sorted.length ? `
            <div class="faction-detail-row faction-detail-header"><div>FACTION</div><div>GAMES</div><div>WINS</div><div>LOSSES</div><div>WIN RATE</div></div>
            ${sorted.map(([faction, item]) => {
                const rate = item.played ? Math.round((item.wins / item.played) * 100) : 0;
                return `<div class="faction-detail-row"><div>${escapeHtml(faction)} <span class="r721-category-chip">${escapeHtml(item.category)}</span></div><div>${item.played}</div><div>${item.wins}</div><div>${item.losses}</div><div>${rate}%</div></div>`;
            }).join("")}
        ` : '<div class="empty">No matches belong to a player with a faction allegiance yet.</div>';
    }

    async function deleteMatch(gameId) {
        if (!gameId || !currentUser) return;
        if (!window.confirm("DELETE THIS BATTLE RECORD? This cannot be undone.")) return;

        const { error } = await supabaseClient.from("games").delete().eq("id", gameId);
        if (error) {
            alert("Could not delete the match: " + error.message);
            return;
        }

        document.getElementById("detailsModal")?.classList.add("hidden");
        await loadMatches();
        await loadRecentMatches();
        await updateStats();
        await loadFactionStatsByProfile();
    }

    function canDeleteGroup(group) {
        return !!currentUser && group?.created_by === currentUser.id;
    }

    async function deleteGroup(groupId) {
        const group = currentGroups.find(item => item.id === groupId);
        if (!group || !canDeleteGroup(group)) return;
        if (!window.confirm(`DELETE "${group.name}"? All matches and memberships in this group will also be deleted.`)) return;

        const { error } = await supabaseClient.from("groups").delete().eq("id", groupId);
        if (error) {
            alert("Could not delete the group: " + error.message);
            return;
        }

        if (selectedGroupId === groupId) {
            selectedGroupId = null;
            selectedGroup = null;
        }

        await loadGroups();
        await loadMatches();
        await loadRecentMatches();
        await updateStats();
        await loadFactionStatsByProfile();
    }

    function addGroupDeleteControls() {
        document.querySelectorAll("[data-group-id]").forEach(card => {
            if (card.querySelector(".r721-delete-group")) return;
            const group = currentGroups.find(item => item.id === card.dataset.groupId);
            if (!canDeleteGroup(group)) return;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "r721-delete-group small-button";
            button.textContent = "DELETE GROUP";
            button.dataset.groupId = card.dataset.groupId;
            button.addEventListener("click", event => {
                event.stopPropagation();
                deleteGroup(button.dataset.groupId);
            });
            card.appendChild(button);
        });
    }

    function addMatchDeleteButton() {
        const buttons = document.querySelector("#detailsModal .modal-buttons");
        if (!buttons || document.getElementById("r721DeleteMatchButton")) return;

        const button = document.createElement("button");
        button.id = "r721DeleteMatchButton";
        button.type = "button";
        button.className = "secondary-button r721-danger-button";
        button.textContent = "DELETE BATTLE";
        button.addEventListener("click", () => deleteMatch(button.dataset.gameId));
        buttons.insertBefore(button, buttons.firstChild);
    }

    function wireDynamicUi() {
        const profileNav = document.querySelector('.nav-button[data-page="profile"]');
        if (profileNav) profileNav.addEventListener("click", () => prepareProfileFaction());

        const factionNav = document.querySelector('.nav-button[data-page="factions"]');
        if (factionNav) factionNav.addEventListener("click", event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            showPage("factions");
            loadFactionStatsByProfile();
        }, true);

        const groupsNav = document.querySelector('.nav-button[data-page="groups"]');
        if (groupsNav) groupsNav.addEventListener("click", () => waitForGroupCards());

        const matchesList = document.getElementById("matchesList");
        if (matchesList) {
            matchesList.addEventListener("click", event => {
                const row = event.target.closest(".match-row");
                if (!row) return;
                const game = currentGames.find(item => item.id === row.dataset.gameId);
                if (!game) return;
                queueMicrotask(() => {
                    addMatchDeleteButton();
                    const button = document.getElementById("r721DeleteMatchButton");
                    if (button) button.dataset.gameId = game.id;
                });
            });
        }

        const modalConfirm = document.getElementById("modalConfirm");
        if (modalConfirm) modalConfirm.addEventListener("click", event => {
            const matchForm = document.getElementById("matchForm");
            if (!matchForm || matchForm.classList.contains("hidden")) return;
            const select = document.getElementById("profileMainFaction");
            if (!select || !CATEGORY_VALUES.includes(select.value)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                setModalStatus("Set your Faction Allegiance in MY PROFILE before recording a match.", "error");
            }
        }, true);

        const saveButton = document.getElementById("saveProfileButton");
        if (saveButton) {
            saveButton.addEventListener("click", event => {
                const select = document.getElementById("profileMainFaction");
                if (!select || !CATEGORY_VALUES.includes(select.value)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    setProfileStatus("Select Imperium, Chaos or Xenos before saving your profile.", "error");
                }
            }, true);
            saveButton.addEventListener("click", async () => {
                await saveFactionCategory();
            });
        }
    }

    async function waitForGroupCards() {
        for (let i = 0; i < 30; i++) {
            addGroupDeleteControls();
            if (document.querySelector("[data-group-id]")) return;
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    function addFactionStyles() {
        if (document.getElementById("r721-feature-styles")) return;
        const style = document.createElement("style");
        style.id = "r721-feature-styles";
        style.textContent = `
            .r721-faction-help { margin-top:6px; color:#77705f; font-size:8px; line-height:1.5; }
            .r721-category-chip { display:inline-block; margin-left:6px; padding:2px 5px; border:1px solid #4d4128; color:#b9964d; font-size:7px; letter-spacing:.6px; }
            .r721-delete-group { margin-top:12px; border-color:#6f3028 !important; color:#d18b7b !important; }
            .r721-danger-button { border-color:#7d3028 !important; color:#d18b7b !important; }
            #r721FactionCategoryGroup select { width:100%; }
        `;
        document.head.appendChild(style);
    }

    document.addEventListener("DOMContentLoaded", () => {
        addFactionStyles();
        wireDynamicUi();
        addMatchDeleteButton();
        prepareProfileFaction();
        addGroupDeleteControls();
        waitForGroupCards();
        setTimeout(addGroupDeleteControls, 1000);
    });
})();
