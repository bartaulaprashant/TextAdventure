import "./style.css";
import { createGameSession, createGameSessionFromWorld } from "./engine/gameSession.js";
import {exportWorldAsZip} from "./builder/worldExport.js";
import { importWorldFromZip } from "./builder/worldImport.js";
import {
  createWorldDraft,
  addRoom,
  updateRoom,
  deleteRoom,
  validateDraft,
  DIRECTIONS,
  addEntity,
  updateEntity,
  deleteEntity,
  addRule,
  updateRule,
  deleteRule,
  addCondition,
  updateCondition,
  deleteCondition,
  addEffect,
  updateEffect,
  deleteEffect,
  loadBuilderDraft,
  saveBuilderDraft
} from "./builder/worldDraft.js";

const app = document.querySelector("#app");

let session = null;
let isLoadingGame = false;
let gameError = "";
let activeImportedWorld = null;

const state = {
  page: "home",
  transcript: [],
  builderDraft: loadBuilderDraft(),
  editingRoomId: "starting-room",
  builderNotice: "",
  editingEntityId: null,
  editingRuleId: null,
  editingConditionIndex: null,
  builderSaveStatus: "Draft is saved automatically in this browser.",
};

const BUILDER_DRAFT_STORAGE_KEY = "text-adventure-builder-draft";
function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function button(label, action, className = "") {
  return `<button class="${className}" data-action="${action}">${label}</button>`;
}

function navLink(label, page) {
  const active = state.page === page ? "active" : "";
  return `<button class="nav-link ${active}" data-page="${page}">${label}</button>`;
}
function setBuilderDraft(draft) {
  state.builderDraft = draft;

  const saved = saveBuilderDraft(draft);

  state.builderSaveStatus = saved
    ? "All changes saved locally."
    : "Could not save changes. Check browser storage.";
}
function saveCurrentDraft() {
  const saved = saveBuilderDraft(state.builderDraft);

  state.builderSaveStatus = saved
    ? "Draft saved successfully."
    : "Could not save draft.";

  state.builderNotice = state.builderSaveStatus;
}

function clearCurrentDraft() {
  try {
    localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);

    state.builderDraft = createWorldDraft();

    state.editingRoomId = "starting-room";
    state.editingEntityId = null;
    state.editingRuleId = null;
    state.editingConditionIndex = null;

    state.builderSaveStatus = "Fresh draft. Changes will be saved automatically.";
    state.builderNotice = "Draft cleared. A new world has been created.";

    return true;
  } catch (error) {
    console.error("Could not clear builder draft:", error);
    state.builderNotice = "Could not clear saved draft.";
    return false;
  }
}

function renderShell(content) {
  app.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <button class="brand" data-page="home" aria-label="Go home">
          <span class="brand-icon">&gt;_</span>
          <span>TEXT ADVENTURE</span>
        </button>

        <nav class="main-nav" aria-label="Main navigation">
          ${navLink("Play", "play")}
          ${navLink("Create", "create")}
          ${navLink("About", "about")}
        </nav>
      </header>

      <main>${content}</main>

      <footer class="site-footer">
        <span>TEXT ADVENTURE <span class="muted">v1.0.0</span></span>
        <span>Your story. Your world.</span>
      </footer>
    </div>
  `;
}

function renderHome() {
  renderShell(`
    <section class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">A WORLD OF YOUR OWN</p>
        <h1>Text Adventure<span class="cursor">_</span></h1>
        <p class="hero-tagline">Explore. Solve. Discover.</p>
        <p class="hero-description">
          Enter mysterious worlds built from words, choices, and clever puzzles.
          Play an adventure or build one of your own.
        </p>

        <div class="button-row">
          ${button("▶ &nbsp; Play Adventure", "play", "btn btn-primary")}
          ${button("✎ &nbsp; Create World", "create", "btn")}
          ${button("ⓘ &nbsp; About", "about", "btn")}
        </div>
      </div>

      <div class="hero-art" aria-label="Retro pixel-art dungeon illustration">
        <div class="art-frame">
          <div class="art-symbol">╔══════════╗<br>
            ║ &nbsp; ? &nbsp; ? &nbsp; ? &nbsp; ║<br>
            ║ &nbsp; ┌──┐ &nbsp; ║<br>
            ║ &nbsp; │ ░ │ &nbsp; ║<br>
            ║ &nbsp; └──┘ &nbsp; ║<br>
            ╚══════════╝
          </div>
          <p>THE UNKNOWN AWAITS</p>
        </div>
      </div>
    </section>

    <section class="home-grid">
      <article class="panel feature-panel">
        <p class="section-kicker">01 / PLAY</p>
        <h2>Featured Adventure</h2>
        <div class="world-preview">
          <div class="world-icon" aria-hidden="true">⌂</div>
          <div>
            <h3>The Forgotten Cellar</h3>
            <p>
              An abandoned house. A rusty key. A locked cellar hiding
              something below.
            </p>
            ${button("▶ &nbsp; Enter World", "play", "btn btn-small")}
          </div>
        </div>
        <p class="small-note">The first playable world in the collection.</p>
      </article>

      <article class="panel feature-panel">
        <p class="section-kicker">02 / CREATE</p>
        <h2>Build Your Own World</h2>
        <p class="feature-lead">Your imagination sets the rules.</p>
        <ol class="steps">
          <li><span>01</span><div><strong>Define your world</strong><p>Name it and choose a starting room.</p></div></li>
          <li><span>02</span><div><strong>Build rooms and puzzles</strong><p>Connect locations, add objects, and create rules.</p></div></li>
          <li><span>03</span><div><strong>Export and play</strong><p>Download your world and load it into the game.</p></div></li>
        </ol>
        ${button("✎ &nbsp; Open World Builder", "create", "btn btn-wide")}
      </article>

      <article class="panel feature-panel">
        <p class="section-kicker">03 / THE ENGINE</p>
        <h2>About the Project</h2>
        <p>
          A browser-based text adventure engine with separate world data,
          reusable gameplay systems, and a terminal-inspired interface.
        </p>
        <ul class="feature-list">
          <li>Typed commands and clickable suggestions</li>
          <li>JSON-driven rooms, entities, and rules</li>
          <li>Custom-world import and export — planned</li>
          <li>Local save/load — planned</li>
        </ul>
        ${button("Learn About the Engine →", "about", "text-link")}
      </article>
    </section>
  `);
}


function renderPlay() {
  if (!session) {
    renderShell(`
      <section class="page-heading">
        <p class="eyebrow">PLAY / 01</p>
        <h1>Choose your adventure</h1>
        <p>Step into a world and discover what it holds.</p>
      </section>

      <section class="panel play-card">
        <div class="world-icon large" aria-hidden="true">⌂</div>
        <div class="play-card-copy">
          <p class="section-kicker">AVAILABLE WORLD</p>
          <h2>The Forgotten Cellar</h2>
          <p>
            Explore an abandoned house, find useful objects, and unlock
            the way into the cellar.
          </p>
          ${button(
            isLoadingGame ? "Loading world..." : "▶ &nbsp; Start Playing",
            "start-game",
            "btn btn-primary",
          )}
        </div>
      </section>

      <section class="panel play-card import-world-card">
        <div class="world-icon large" aria-hidden="true">⇧</div>
        <div class="play-card-copy">
          <p class="section-kicker">CUSTOM WORLD</p>
          <h2>Import Your Own World</h2>
          <p>
            Load an adventure exported from the World Builder.
            Select a world package in ZIP format to start playing.
          </p>

          <input
            type="file"
            id="game-world-import-input"
            accept=".zip,application/zip"
            hidden
          />

          <button
            type="button"
            class="btn btn-primary"
            data-action="import-game-world"
            ${isLoadingGame ? "disabled" : ""}
          >
            ⇧ &nbsp; Import World (.zip)
          </button>
        </div>
      </section>

      ${gameError
        ? `<p class="error-message">${escapeHTML(gameError)}</p>`
        : ""}
    `);
    return;
  }

  const room = session.getCurrentRoom();
  const inventory = session.getInventory();
  const suggestions = session.getSuggestions();

  renderShell(`
    <section class="page-heading compact-heading">
      <p class="eyebrow">PLAY / ${escapeHTML(session.title)}</p>
      <h1>Adventure Terminal<span class="cursor">_</span></h1>
    </section>

    <section class="game-layout">
      <div class="panel game-panel">
        <div class="terminal-bar">
          <span><span class="status-dot"></span> WORLD SESSION ACTIVE</span>
          <span>TURN ${session.getState().turnCount}</span>
        </div>

        <div class="room-heading">
          <p class="section-kicker">CURRENT LOCATION</p>
          <h2>${escapeHTML(room?.name ?? "Unknown Room")}</h2>
          <p>${escapeHTML(room?.description ?? "")}</p>
        </div>

        <div class="transcript" id="transcript" aria-live="polite">
          ${state.transcript
            .map(
              (entry) => `
            <p class="transcript-line ${entry.type}">
              <span class="line-prefix">${entry.type === "command" ? ">" : "·"}</span>
              ${escapeHTML(entry.text)}
            </p>
          `,
            )
            .join("")}
        </div>

        <form id="command-form" class="command-form">
          <label for="command-input">&gt;</label>
          <input
            id="command-input"
            name="command"
            autocomplete="off"
            placeholder="Enter a command..."
            aria-label="Enter a game command"
          />
          <button class="btn btn-small" type="submit">SEND ↵</button>
        </form>

        <div class="suggestions">
          <p class="section-kicker">SUGGESTED COMMANDS</p>
          <div class="suggestion-list">
            ${suggestions
              .map((suggestion) =>
                button(
                  escapeHTML(suggestion),
                  `command:${suggestion}`,
                  "suggestion",
                ),
              )
              .join("")}
          </div>
        </div>
      </div>

      <aside class="panel inventory-panel">
        <p class="section-kicker">PLAYER STATUS</p>
        <h2>Inventory</h2>
        ${
          inventory.length
            ? `<ul class="inventory-list">${inventory
                .map((item) => `<li>${escapeHTML(item.name)}</li>`)
                .join("")}</ul>`
            : `<p class="muted">Your inventory is empty.</p>`
        }
        <div class="panel-divider"></div>
        <p class="section-kicker">WORLD ID</p>
        <p class="mono">${escapeHTML(session.worldId)}</p>
        ${button("↻ Restart World", "restart-game", "btn btn-wide")}
      </aside>
    </section>
  `);

  const transcript = document.querySelector("#transcript");
  if (transcript) transcript.scrollTop = transcript.scrollHeight;
}


function renderExitOptions(room, direction) {
  const selectedId = room.exits[direction] ?? "";

  return `
    <label class="builder-field">
      <span>${direction.toUpperCase()} EXIT</span>
      <select name="exit-${direction}">
        <option value="">No exit</option>
        ${state.builderDraft.rooms
          .filter((candidate) => candidate.id !== room.id)
          .map(
            (candidate) => `
            <option
              value="${escapeHTML(candidate.id)}"
              ${selectedId === candidate.id ? "selected" : ""}
            >
              ${escapeHTML(candidate.name)}
            </option>
          `,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderRoomList() {
  return state.builderDraft.rooms
    .map(
      (room) => `
    <div class="builder-room-row">
      <div>
        <strong>${escapeHTML(room.name)}</strong>
        <p class="mono">${escapeHTML(room.id)}</p>
        ${
          room.id === state.builderDraft.manifest.startRoomId
            ? '<span class="room-badge">START ROOM</span>'
            : ""
        }
      </div>
      <div class="room-row-actions">
        <button
          class="btn btn-small"
          data-action="edit-room:${escapeHTML(room.id)}"
        >Edit</button>
        <button
          class="btn btn-small btn-danger"
          data-action="delete-room:${escapeHTML(room.id)}"
          ${state.builderDraft.rooms.length === 1 ? "disabled" : ""}
        >Delete</button>
      </div>
    </div>
  `,
    )
    .join("");
}
function renderRuleList() {
  const rules = state.builderDraft.rules;

  if (!rules.length) {
    return `
      <p class="empty-state">
        No rules created yet. Add a rule to define how your world responds to player actions.
      </p>
    `;
  }

  return rules
    .map(
      (rule) => `
    <article class="builder-item">
      <div class="builder-item-info">
        <strong>${escapeHTML(rule.id)}</strong>
        <small>
          Use:
          ${escapeHTML(rule.trigger.itemId || "No item")}
          →
          ${escapeHTML(rule.trigger.targetId || "No target")}
        </small>
      </div>

      <div class="builder-item-actions">
        <button
          class="button button-small"
          data-action="edit-rule:${escapeHTML(rule.id)}"
        >
          Edit
        </button>

        <button
          class="button button-small button-danger"
          data-action="delete-rule:${escapeHTML(rule.id)}"
        >
          Delete
        </button>
      </div>
    </article>
  `,
    )
    .join("");
}
function renderConditionEditor(rule) {
  if (!rule.conditions.length) {
    return `
      <p class="empty-state">
        No conditions yet. This rule will have no additional requirements.
      </p>
    `;
  }

  return rule.conditions
    .map((condition, index) => {
      const entityOptions = (selectedId) => `
      <option value="">Select an entity</option>
      ${state.builderDraft.entities
        .map(
          (entity) => `
        <option
          value="${escapeHTML(entity.id)}"
          ${entity.id === selectedId ? "selected" : ""}
        >
          ${escapeHTML(entity.name)}
        </option>
      `,
        )
        .join("")}
    `;

      const roomOptions = (selectedId) => `
      <option value="">Select a room</option>
      ${state.builderDraft.rooms
        .map(
          (room) => `
        <option
          value="${escapeHTML(room.id)}"
          ${room.id === selectedId ? "selected" : ""}
        >
          ${escapeHTML(room.name)}
        </option>
      `,
        )
        .join("")}
    `;

      let fields = "";

      if (condition.op === "flag-equals") {
        fields = `
        <label>
          Flag name
          <input
            name="flag"
            value="${escapeHTML(condition.flag)}"
            required
          />
        </label>

        <label>
          Expected value (JSON)
          <input
            name="value"
            value="${escapeHTML(JSON.stringify(condition.value))}"
            required
          />
        </label>
      `;
      }

      if (condition.op === "entity-location-is") {
        fields = `
        <label>
          Entity
          <select name="entityId" required>
            ${entityOptions(condition.entityId)}
          </select>
        </label>

        <label>
          Expected location
          <select name="location" required>
            <option value="inventory" ${condition.location === "inventory" ? "selected" : ""}>Player inventory</option>
            ${roomOptions(condition.location)}
          </select>
        </label>
      `;
      }

      if (condition.op === "entity-property-equals") {
        fields = `
        <label>
          Entity
          <select name="entityId" required>
            ${entityOptions(condition.entityId)}
          </select>
        </label>

        <label>
          Property name
          <input
            name="property"
            value="${escapeHTML(condition.property)}"
            required
          />
        </label>

        <label>
          Expected value (JSON)
          <input
            name="value"
            value="${escapeHTML(JSON.stringify(condition.value))}"
            required
          />
        </label>
      `;
      }

      if (condition.op === "room-is") {
        fields = `
        <label>
          Room
          <select name="roomId" required>
            ${roomOptions(condition.roomId)}
          </select>
        </label>
      `;
      }

      return `
      <form
        class="condition-card"
        data-condition-index="${index}"
      >
        <div class="condition-card-heading">
          <strong>Condition ${index + 1}</strong>

          <button
            type="button"
            class="button button-small button-danger"
            data-action="delete-condition:${index}"
          >
            Remove
          </button>
        </div>

        <label>
          Condition type
          <select name="op" required>
            <option value="flag-equals" ${condition.op === "flag-equals" ? "selected" : ""}>Flag equals</option>
            <option value="entity-location-is" ${condition.op === "entity-location-is" ? "selected" : ""}>Entity location is</option>
            <option value="entity-property-equals" ${condition.op === "entity-property-equals" ? "selected" : ""}>Entity property equals</option>
            <option value="room-is" ${condition.op === "room-is" ? "selected" : ""}>Current room is</option>
          </select>
        </label>

        <div class="condition-fields">
          ${fields}
        </div>

        <button
          type="submit"
          class="button button-small"
          data-action="save-condition"
        >
          Save Condition
        </button>
      </form>
    `;
    })
    .join("");
}

function renderEffectEditor(rule) {
  if (!rule.effects.length) {
    return `
      <p class="empty-state">
        No effects yet. This rule will not change the game state.
      </p>
    `;
  }

  return rule.effects
    .map((effect, index) => {
      const entityOptions = (selectedId) => `
        <option value="">Select an entity</option>
        ${state.builderDraft.entities
          .map(
            (entity) => `
              <option
                value="${escapeHTML(entity.id)}"
                ${entity.id === selectedId ? "selected" : ""}
              >
                ${escapeHTML(entity.name)}
              </option>
            `
          )
          .join("")}
      `;

      const roomOptions = (selectedLocation) => `
        ${state.builderDraft.rooms
          .map(
            (room) => `
              <option
                value="${escapeHTML(room.id)}"
                ${room.id === selectedLocation ? "selected" : ""}
              >
                ${escapeHTML(room.name)}
              </option>
            `
          )
          .join("")}
      `;

      let fields = "";

      if (effect.op === "set-flag") {
        fields = `
          <label>
            Flag name
            <input
              name="flag"
              value="${escapeHTML(effect.flag || "")}"
              required
            />
          </label>

          <label>
            New value (JSON)
            <input
              name="value"
              value="${escapeHTML(JSON.stringify(effect.value))}"
              required
            />
          </label>
        `;
      }

      if (effect.op === "set-entity-property") {
        fields = `
          <label>
            Entity
            <select name="entityId" required>
              ${entityOptions(effect.entityId)}
            </select>
          </label>

          <label>
            Property name
            <input
              name="property"
              value="${escapeHTML(effect.property || "")}"
              required
            />
          </label>

          <label>
            New value (JSON)
            <input
              name="value"
              value="${escapeHTML(JSON.stringify(effect.value))}"
              required
            />
          </label>
        `;
      }

      if (effect.op === "move-entity") {
        fields = `
          <label>
            Entity
            <select name="entityId" required>
              ${entityOptions(effect.entityId)}
            </select>
          </label>

          <label>
            Destination
            <select name="location" required>
              <option value="">Select a destination</option>
              <option
                value="inventory"
                ${effect.location === "inventory" ? "selected" : ""}
              >
                Player inventory
              </option>
              ${roomOptions(effect.location)}
            </select>
          </label>
        `;
      }

      return `
        <form
          class="effect-card"
          data-effect-index="${index}"
        >
          <div class="condition-card-heading">
            <strong>Effect ${index + 1}</strong>

            <button
              type="button"
              class="button button-small button-danger"
              data-action="delete-effect:${index}"
            >
              Remove
            </button>
          </div>

          <label>
            Effect type
            <select name="op" required data-effect-op>
              <option
                value="set-flag"
                ${effect.op === "set-flag" ? "selected" : ""}
              >
                Set game flag
              </option>

              <option
                value="set-entity-property"
                ${effect.op === "set-entity-property" ? "selected" : ""}
              >
                Set entity property
              </option>

              <option
                value="move-entity"
                ${effect.op === "move-entity" ? "selected" : ""}
              >
                Move entity
              </option>
            </select>
          </label>

          <div class="condition-fields">
            ${fields}
          </div>

          <button
            type="submit"
            class="button button-small"
            data-action="save-effect"
          >
            Save Effect
          </button>
        </form>
      `;
    })
    .join("");
}

function renderEntityList() {
  return state.builderDraft.entities
    .map(
      (entity) => `
    <div class="builder-room-row">
      <div>
        <strong>${escapeHTML(entity.name)}</strong>
        <p class="mono">${escapeHTML(entity.id)}</p>
        <span class="room-badge">
          ${entity.portable ? "PORTABLE" : "FIXED OBJECT"}
        </span>
      </div>

      <div class="room-row-actions">
        <button
          class="btn btn-small"
          data-action="edit-entity:${escapeHTML(entity.id)}"
        >Edit</button>

        <button
          class="btn btn-small btn-danger"
          data-action="delete-entity:${escapeHTML(entity.id)}"
        >Delete</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderCreate() {
  const draft = state.builderDraft;
  const editingRoom =
    draft.rooms.find((room) => room.id === state.editingRoomId) ??
    draft.rooms[0] ??
    null;
  const editingRule =
    draft.rules.find((rule) => rule.id === state.editingRuleId) ?? null;

  const ruleEntityOptions = (selectedId) => `
  <option value="">Select an entity</option>
  ${draft.entities
    .map(
      (entity) => `
    <option
      value="${escapeHTML(entity.id)}"
      ${entity.id === selectedId ? "selected" : ""}
    >
      ${escapeHTML(entity.name)} (${escapeHTML(entity.id)})
    </option>
  `,
    )
    .join("")}
`;
  const editingEntity =
    draft.entities.find((entity) => entity.id === state.editingEntityId) ??
    null;

  const validation = validateDraft(draft);

  renderShell(`
    <section class="page-heading">
  <p class="eyebrow">CREATE / WORLD WORKSHOP</p>
  <h1>${escapeHTML(draft.manifest.title)}<span class="cursor">_</span></h1>
  <p>
    WORLD ID:
    <span class="mono">${escapeHTML(draft.manifest.id)}</span>
  </p>
</section>

<div class="builder-draft-toolbar">
  <div class="draft-status">
    <span class="section-kicker">DRAFT STATUS</span>
    <p class="muted">${escapeHTML(state.builderSaveStatus)}</p>
  </div>

  <div class="draft-actions">
    <button
      type="button"
      class="btn btn-primary"
      data-action="save-draft"
    >
      Save Draft
    </button>

    <button
      type="button"
      class="btn"
      data-action="clear-draft"
    >
      Clear Draft
    </button>
    <button
  type="button"
  class="btn"
  data-action="export-world"
>
  Export World (.zip)
</button>
<button
  type="button"
  class="btn"
  data-action="import-world"
>
  Import World (.zip)
</button>

<input
  type="file"
  id="world-import-input"
  accept=".zip,application/zip"
  hidden
/>
  </div>
</div>

    <div class="builder-workspace">
      <section class="panel builder-section">
        <p class="section-kicker">01 / WORLD DETAILS</p>
        <h2>Set the scene</h2>

        <form id="world-details-form" class="builder-form">
          <label class="builder-field">
            <span>WORLD TITLE</span>
            <input
              name="title"
              required
              maxlength="80"
              value="${escapeHTML(draft.manifest.title)}"
              placeholder="The Forgotten Kingdom"
            />
          </label>

          <label class="builder-field">
            <span>WORLD ID</span>
            <input
              name="worldId"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value="${escapeHTML(draft.manifest.id)}"
              placeholder="forgotten-kingdom"
            />
            <small>Lowercase letters, numbers, and hyphens only.</small>
          </label>

          <label class="builder-field">
            <span>INTRODUCTION</span>
            <textarea
              name="intro"
              rows="3"
              maxlength="1000"
            >${escapeHTML(draft.text.intro)}</textarea>
          </label>

          <label class="builder-field">
            <span>STARTING ROOM</span>
            <select name="startRoomId" required>
              ${draft.rooms
                .map(
                  (room) => `
                <option
                  value="${escapeHTML(room.id)}"
                  ${draft.manifest.startRoomId === room.id ? "selected" : ""}
                >
                  ${escapeHTML(room.name)}
                </option>
              `,
                )
                .join("")}
            </select>
          </label>

          <button class="btn btn-primary" type="submit">
            Save World Details
          </button>
        </form>
      </section>

      <section class="panel builder-section">
        <p class="section-kicker">02 / LOCATIONS</p>
        <h2>Rooms & Connections</h2>
        <p class="muted">
          Each room is a location. Exits connect it to other rooms.
        </p>

        <div class="builder-room-list">
          ${renderRoomList()}
        </div>

        <form id="add-room-form" class="add-room-form">
          <label class="builder-field">
            <span>NEW ROOM NAME</span>
            <input
              name="newRoomName"
              required
              maxlength="80"
              placeholder="e.g. Hidden Library"
            />
          </label>
          <button class="btn btn-wide" type="submit">+ Add Room</button>
        </form>
      </section>

      ${
        editingRoom
          ? `
        <section class="panel builder-section room-editor">
          <p class="section-kicker">03 / ROOM EDITOR</p>
          <h2>Edit: ${escapeHTML(editingRoom.name)}</h2>

          <form id="room-editor-form" class="builder-form">
            <input
              type="hidden"
              name="roomId"
              value="${escapeHTML(editingRoom.id)}"
            />

            <label class="builder-field">
              <span>ROOM NAME</span>
              <input
                name="roomName"
                required
                maxlength="80"
                value="${escapeHTML(editingRoom.name)}"
              />
            </label>

            <label class="builder-field">
              <span>ROOM DESCRIPTION</span>
              <textarea
                name="roomDescription"
                rows="4"
                required
                maxlength="2000"
              >${escapeHTML(editingRoom.description)}</textarea>
            </label>

            <div class="exit-editor">
              <p class="section-kicker">DIRECTIONAL EXITS</p>
              <p class="muted">
                Choose a destination for each direction, or select No exit.
              </p>
              <div class="exit-grid">
                ${DIRECTIONS.map((direction) =>
                  renderExitOptions(editingRoom, direction),
                ).join("")}
              </div>
            </div>

            <button class="btn btn-primary" type="submit">
              Save Room
            </button>
          </form>
        </section>
      `
          : ""
      }


<section class="panel builder-section entity-section">
  <p class="section-kicker">04 / ENTITIES</p>
  <h2>Objects & Items</h2>
  <p class="muted">
    Add objects that players can discover, examine, collect, or interact with.
  </p>

  <div class="builder-room-list">
    ${
      renderEntityList() ||
      `
      <p class="muted">No entities created yet.</p>
    `
    }
  </div>

  <form id="add-entity-form" class="add-room-form">
    <label class="builder-field">
      <span>NEW ENTITY NAME</span>
      <input
        name="newEntityName"
        required
        maxlength="80"
        placeholder="e.g. Rusty Key"
      />
    </label>
    <button class="btn btn-wide" type="submit">+ Add Entity</button>
  </form>

  ${
    editingEntity
      ? `
    <div class="entity-editor">
      <div class="panel-divider"></div>
      <p class="section-kicker">ENTITY EDITOR</p>
      <h2>${escapeHTML(editingEntity.name)}</h2>

      <form id="entity-editor-form" class="builder-form">
        <input
          type="hidden"
          name="entityId"
          value="${escapeHTML(editingEntity.id)}"
        />

        <label class="builder-field">
          <span>ENTITY NAME</span>
          <input
            name="entityName"
            required
            maxlength="80"
            value="${escapeHTML(editingEntity.name)}"
          />
        </label>

        <label class="builder-field">
          <span>DESCRIPTION</span>
          <textarea
            name="entityDescription"
            rows="3"
            required
            maxlength="2000"
          >${escapeHTML(editingEntity.description)}</textarea>
        </label>

        <label class="builder-field">
          <span>INITIAL LOCATION</span>
          <select name="initialLocation" required>
            ${draft.rooms
              .map(
                (room) => `
              <option
                value="${escapeHTML(room.id)}"
                ${editingEntity.initialLocation === room.id ? "selected" : ""}
              >
                ${escapeHTML(room.name)}
              </option>
            `,
              )
              .join("")}
          </select>
        </label>

        <label class="builder-field">
          <span>ALIASES</span>
          <input
            name="aliases"
            value="${escapeHTML(editingEntity.aliases.join(", "))}"
            placeholder="old key, iron key"
          />
          <small>Separate alternative names with commas.</small>
        </label>

        <label class="builder-field">
          <span>INITIAL PROPERTIES (JSON)</span>
          <textarea
            name="initialProperties"
            rows="4"
            spellcheck="false"
          >${escapeHTML(JSON.stringify(editingEntity.initialProperties, null, 2))}</textarea>
          <small>
            Example: {"locked": false, "weight": 5}
          </small>
        </label>

        <label class="entity-checkbox">
          <input
            type="checkbox"
            name="portable"
            ${editingEntity.portable ? "checked" : ""}
          />
          <span>
            <strong>Portable object</strong>
            <small>Allow the player to take this object into their inventory.</small>
          </span>
        </label>

        <button class="btn btn-primary" type="submit">
          Save Entity
        </button>
      </form>
    </div>
  `
      : ""
  }
</section>


<section class="builder-section rule-section">
  <div class="section-heading">
    <div>
      <p class="eyebrow">WORLD LOGIC</p>
      <h2>Puzzle Rules</h2>
      <p>
        Define how objects interact and how the world responds to player actions.
      </p>
    </div>
  </div>

  <div class="builder-list">
    ${renderRuleList()}
  </div>

  <form id="add-rule-form" class="inline-form">
    <label>
      New rule name
      <input
        type="text"
        name="name"
        placeholder="e.g. Unlock Cellar Door"
        required
      />
    </label>

    <button type="submit" class="button">
      + Add Rule
    </button>
  </form>

  ${
    editingRule
      ? `
    <div class="entity-editor rule-editor">
      <div class="section-heading">
        <div>
          <p class="eyebrow">EDITING RULE</p>
          <h3>${escapeHTML(editingRule.id)}</h3>
        </div>
      </div>

      <form id="rule-editor-form" class="builder-form">
        <input
          type="hidden"
          name="id"
          value="${escapeHTML(editingRule.id)}"
        />

        <label>
          Trigger item
          <select name="itemId" required>
            ${ruleEntityOptions(editingRule.trigger.itemId)}
          </select>
          <small>The object the player will use.</small>
        </label>

        <label>
          Target entity
          <select name="targetId" required>
            ${ruleEntityOptions(editingRule.trigger.targetId)}
          </select>
          <small>The object the player will use the item on.</small>
        </label>

        <label>
          Success message
          <textarea
            name="successMessage"
            rows="3"
            required
          >${escapeHTML(editingRule.successMessage)}</textarea>
        </label>

        <div class="form-actions">
          <button type="submit" class="button">
            Save Rule
          </button>

          <button
            type="button"
            class="button button-secondary"
            data-action="cancel-rule-edit"
          >
            Cancel
          </button>
        </div>
      </form>

        <div class="condition-editor">
  <div class="section-heading">
    <div>
      <p class="eyebrow">REQUIREMENTS</p>
      <h4>Conditions</h4>
      <p>Every condition must be true for this rule to execute.</p>
    </div>
  </div>

  ${renderConditionEditor(editingRule)}

  <button
    type="button"
    class="button button-secondary"
    data-action="add-condition"
  >
    + Add Condition
  </button>
</div>
    </div>

    <div class="condition-editor">
  <div class="section-heading">
    <div>
      <p class="eyebrow">RESULTS</p>
      <h4>Effects</h4>
      <p>These changes happen when all conditions are satisfied.</p>
    </div>
  </div>

  ${renderEffectEditor(editingRule)}

  <button
    type="button"
    class="button button-secondary"
    data-action="add-effect"
  >
    + Add Effect
  </button>
</div>
  `
      : ""
  }
</section>


      <section class="panel builder-section">
        <p class="section-kicker">04 / VALIDATION</p>
        <h2>World Check</h2>

        <p class="${validation.ok ? "validation-ok" : "validation-error"}">
          ${
            validation.ok
              ? "✓ Your current room structure is valid."
              : "⚠ Fix the following issues before continuing:"
          }
        </p>

        ${
          validation.errors.length
            ? `
          <ul class="validation-list">
            ${validation.errors
              .map((error) => `<li>${escapeHTML(error)}</li>`)
              .join("")}
          </ul>
        `
            : ""
        }

        ${
          state.builderNotice
            ? `<p class="builder-notice">${escapeHTML(state.builderNotice)}</p>`
            : ""
        }

        <div class="world-summary">
          <span>ROOMS <strong>${draft.rooms.length}</strong></span>
          <span>ENTITIES <strong>${draft.entities.length}</strong></span>
          <span>RULES <strong>${draft.rules.length}</strong></span>
        </div>

        <p class="small-note">
          Export is intentionally disabled until entities and rules are supported.
          Your draft currently lives in this page's memory.
        </p>
      </section>
    </div>
  `);
}

function renderAbout() {
  renderShell(`
    <section class="page-heading">
      <p class="eyebrow">ABOUT / 03</p>
      <h1>Behind the Words<span class="cursor">_</span></h1>
      <p>A small engine for worlds that exist in your imagination.</p>
    </section>

    <section class="about-grid">
      <article class="panel">
        <p class="section-kicker">THE IDEA</p>
        <h2>Worlds are data.</h2>
        <p>
          Rooms, exits, entities, and puzzle rules live in separate JSON files.
          The engine interprets that data, manages the game state, and returns
          structured results to the interface.
        </p>
      </article>

      <article class="panel">
        <p class="section-kicker">THE STACK</p>
        <h2>Simple, modular, browser-native.</h2>
        <ul class="feature-list">
          <li>Vanilla JavaScript ES modules</li>
          <li>HTML and CSS</li>
          <li>Vite development server</li>
          <li>JSON-based world definitions</li>
          <li>Vitest for automated tests</li>
        </ul>
      </article>

      <article class="panel">
        <p class="section-kicker">THE ROAD AHEAD</p>
        <h2>Built to grow.</h2>
        <ul class="feature-list">
          <li>Custom-world builder and export</li>
          <li>Import and validate user-created worlds</li>
          <li>Local save/load support</li>
          <li>More puzzles and command handling</li>
        </ul>
      </article>
    </section>
  `);
}

function render() {
  if (state.page === "play") return renderPlay();
  if (state.page === "create") return renderCreate();
  if (state.page === "about") return renderAbout();
  renderHome();
}

async function startGame() {
  if (isLoadingGame) return;
  
  activeImportedWorld = null;
  isLoadingGame = true;
  gameError = "";
  renderPlay();

  try {
    session = await createGameSession("forgotten-cellar");
    state.transcript = [
      { type: "message", text: session.intro },
      { type: "message", text: 'Type "look" to inspect your surroundings.' },
    ];
  } catch (error) {
    gameError =
      error instanceof Error ? error.message : "Could not load the world.";
    session = null;
  } finally {
    isLoadingGame = false;
    renderPlay();
  }
}

async function startImportedGame(file) {
  if (isLoadingGame) return;

  isLoadingGame = true;
  gameError = "";
  renderPlay();

  try {
    const world = await importWorldFromZip(file);

    session = createGameSessionFromWorld(world);

    // Keep the imported data so Restart can restart this same world.
    activeImportedWorld = world;

    state.transcript = [
      { type: "message", text: session.intro },
      {
        type: "message",
        text: 'Type "look" to inspect your surroundings.',
      },
    ];
  } catch (error) {
    console.error("Could not import world:", error);

    gameError =
      error instanceof Error
        ? error.message
        : "Could not import the world.";

    session = null;
    activeImportedWorld = null;
  } finally {
    isLoadingGame = false;
    renderPlay();
  }
}


function runCommand(input) {
  const command = input.trim();
  if (!command || !session) return;

  state.transcript.push({ type: "command", text: command });

  const result = session.execute(command);
  state.transcript.push({
    type: result.ok ? "message" : "error",
    text: result.message ?? "The command could not be completed.",
  });

  renderPlay();
  document.querySelector("#command-input")?.focus();
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-page], [data-action]");
  if (!target) return;

  if (target.dataset.page) {
    state.page = target.dataset.page;
    render();
    return;
  }

  const action = target.dataset.action;

  if (action === "save-draft") {
  saveCurrentDraft();
  renderCreate();
  return;
}

if (action === "clear-draft") {
  const confirmed = window.confirm(
    "Are you sure you want to clear your current world draft? This cannot be undone."
  );

  if (!confirmed) return;

  clearCurrentDraft();
  renderCreate();
  return;
}
if (action === "export-world") {
  try {
    await exportWorldAsZip(state.builderDraft);
    state.builderNotice = "World exported successfully.";
  } catch (error) {
    console.error("World export failed:", error);
    state.builderNotice = "Could not export world.";
  }

  renderCreate();
  return;
}
if (action === "import-world") {
  document.getElementById("world-import-input")?.click();
  return;
}
if (action === "import-game-world") {
  document.getElementById("game-world-import-input")?.click();
  return;
}

  if (action.startsWith("edit-room:")) {
    state.editingRoomId = action.slice("edit-room:".length);
    state.builderNotice = "";
    renderCreate();
    return;
  }

  if (action.startsWith("delete-room:")) {
    const roomId = action.slice("delete-room:".length);

    if (state.builderDraft.rooms.length > 1) {
      setBuilderDraft(deleteRoom(state.builderDraft, roomId));

      if (state.editingRoomId === roomId) {
        state.editingRoomId = state.builderDraft.manifest.startRoomId;
      }

      state.builderNotice =
        "Room deleted. Any exits pointing to it were removed.";
    }

    renderCreate();
    return;
  }

  if (action.startsWith("edit-entity:")) {
    state.editingEntityId = action.slice("edit-entity:".length);
    state.builderNotice = "";
    renderCreate();
    return;
  }

  if (action.startsWith("delete-entity:")) {
    const entityId = action.slice("delete-entity:".length);

    setBuilderDraft(deleteEntity(state.builderDraft, entityId));

    if (state.editingEntityId === entityId) {
      state.editingEntityId = null;
    }

    state.builderNotice =
      "Entity deleted. Any rules referencing it will need attention.";

    renderCreate();
    return;
  }
  if (action.startsWith("edit-rule:")) {
    state.editingRuleId = action.slice("edit-rule:".length);
    state.builderNotice = "";
    renderCreate();
    return;
  }

  if (action.startsWith("delete-rule:")) {
    const ruleId = action.slice("delete-rule:".length);

    setBuilderDraft(deleteRule(state.builderDraft, ruleId));

    if (state.editingRuleId === ruleId) {
      state.editingRuleId = null;
    }

    state.builderNotice = "Rule deleted.";
    renderCreate();
    return;
  }

  if (action === "cancel-rule-edit") {
    state.editingRuleId = null;
    renderCreate();
    return;
  }
  if (action === "add-condition") {
    const ruleId = state.editingRuleId;

    if (!ruleId) return;

    setBuilderDraft(addCondition(state.builderDraft, ruleId, "room-is"));

    state.builderNotice = "Condition added.";
    renderCreate();
    return;
  }

  if (action.startsWith("delete-condition:")) {
    const index = Number(action.slice("delete-condition:".length));

   setBuilderDraft(
  deleteCondition(
    state.builderDraft,
    state.editingRuleId,
    index,
  ),
);

    state.builderNotice = "Condition removed.";
    renderCreate();
    return;
  }

  if (action === "add-effect") {
  const ruleId = state.editingRuleId;

  if (!ruleId) return;

  setBuilderDraft(
  addEffect(
    state.builderDraft,
    ruleId,
    "set-flag",
  ),
);

  state.builderNotice = "Effect added.";
  renderCreate();
  return;
}

if (action.startsWith("delete-effect:")) {
  const index = Number(action.slice("delete-effect:".length));
  const ruleId = state.editingRuleId;

  setBuilderDraft(
    deleteEffect(state.builderDraft, ruleId, index),
  );

  state.builderNotice = "Effect removed.";
  renderCreate();
  return;
}
  if (action === "start-game") {
    await startGame();
  } else if (action === "restart-game") {
    if (activeImportedWorld) {
    session = createGameSessionFromWorld(activeImportedWorld);

    state.transcript = [
      { type: "message", text: session.intro },
      {
        type: "message",
        text: 'Type "look" to inspect your surroundings.',
      },
    ];
  } else {
    session = null;
    state.transcript = [];
  }

  renderPlay();
  return;
  } else if (action.startsWith("command:")) {
    runCommand(action.slice("command:".length));
  } else if (["play", "create", "about", "home"].includes(action)) {
    state.page = action;
    render();
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest("form");
  console.log("A FORM WAS SUBMITTED:", form?.id, event.currentTarget, event);
  event.preventDefault();

  if (form.id === "command-form") {
    const input = form.elements.command;
    runCommand(input.value);
    return;
  }

  const data = new FormData(form);

  if (form.id === "world-details-form") {
    const title = String(data.get("title") ?? "").trim();
    const worldId = String(data.get("worldId") ?? "").trim();
    const intro = String(data.get("intro") ?? "").trim();
    const startRoomId = String(data.get("startRoomId") ?? "");

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(worldId)) {
      state.builderNotice =
        "World ID must contain lowercase letters, numbers, and single hyphens.";
      renderCreate();
      return;
    }

   setBuilderDraft({
  ...state.builderDraft,
  manifest: {
    ...state.builderDraft.manifest,
    id: worldId,
    title,
    startRoomId,
  },
  text: {
    ...state.builderDraft.text,
    intro,
  },
});

    state.builderNotice = "World details saved.";
    renderCreate();
    return;
  }

  if (form.id === "add-room-form") {
    const name = String(data.get("newRoomName") ?? "").trim();
    if (!name) return;

    const previousRoomIds = new Set(
      state.builderDraft.rooms.map((room) => room.id),
    );

    setBuilderDraft(addRoom(state.builderDraft, name));

    const newRoom = state.builderDraft.rooms.find(
      (room) => !previousRoomIds.has(room.id),
    );

    state.editingRoomId = newRoom.id;
    state.builderNotice = `Room "${name}" added.`;
    renderCreate();
    return;
  }

  if (form.id === "room-editor-form") {
    const roomId = String(data.get("roomId") ?? "");
    const name = String(data.get("roomName") ?? "").trim();
    const description = String(data.get("roomDescription") ?? "").trim();

    if (!name || !description) {
      state.builderNotice = "Room name and description are required.";
      renderCreate();
      return;
    }

    const exits = {};

    for (const direction of DIRECTIONS) {
      const destinationId = String(data.get(`exit-${direction}`) ?? "");

      if (destinationId) {
        exits[direction] = destinationId;
      }
    }

    setBuilderDraft(
  updateRoom(state.builderDraft, roomId, {
    name,
    description,
    exits,
  }),
);

    state.builderNotice = "Room saved.";
    renderCreate();
  }

  if (form.id === "add-entity-form") {
    const name = String(data.get("newEntityName") ?? "").trim();
    if (!name) return;

    const previousIds = new Set(
      state.builderDraft.entities.map((entity) => entity.id),
    );

    setBuilderDraft(addEntity(state.builderDraft, name))

    const newEntity = state.builderDraft.entities.find(
      (entity) => !previousIds.has(entity.id),
    );

    state.editingEntityId = newEntity.id;
    state.builderNotice = `Entity "${name}" added.`;
    renderCreate();
    return;
  }

  if (form.id === "entity-editor-form") {
    const entityId = String(data.get("entityId") ?? "");
    const name = String(data.get("entityName") ?? "").trim();
    const description = String(data.get("entityDescription") ?? "").trim();

    const initialLocation = String(data.get("initialLocation") ?? "");

    const aliases = String(data.get("aliases") ?? "")
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);

    const portable = data.get("portable") === "on";

    let initialProperties;

    try {
      initialProperties = JSON.parse(
        String(data.get("initialProperties") ?? "{}"),
      );

      if (
        !initialProperties ||
        typeof initialProperties !== "object" ||
        Array.isArray(initialProperties)
      ) {
        throw new Error("Properties must be a JSON object.");
      }
    } catch (error) {
      state.builderNotice = `Invalid properties JSON: ${error.message}`;
      renderCreate();
      return;
    }

    if (!name || !description) {
      state.builderNotice = "Entity name and description are required.";
      renderCreate();
      return;
    }

    if (!state.builderDraft.rooms.some((room) => room.id === initialLocation)) {
      state.builderNotice = "Select a valid initial room.";
      renderCreate();
      return;
    }

   setBuilderDraft(
  updateEntity(state.builderDraft, entityId, {
    name,
    description,
    initialLocation,
    portable,
    aliases,
    initialProperties,
  }),
);

    state.builderNotice = "Entity saved successfully.";
    renderCreate();
    return;
  }

  if (form.id === "add-rule-form") {
    event.preventDefault();

    const data = new FormData(event.target);
    const name = String(data.get("name") || "").trim();

    if (!name) return;

    const previousIds = new Set(
      state.builderDraft.rules.map((rule) => rule.id),
    );

    setBuilderDraft(addRule(state.builderDraft, name));

    const newRule = state.builderDraft.rules.find(
      (rule) => !previousIds.has(rule.id),
    );

    state.editingRuleId = newRule?.id ?? null;
    state.builderNotice = "Rule created. Configure its trigger below.";

    renderCreate();
    return;
  }

  if (event.target.getAttribute("id") === "rule-editor-form") {
    event.preventDefault();

    const data = new FormData(event.target);
    console.log("Form data:", Object.fromEntries(data.entries()));

    const ruleId = String(data.get("id") || "");
    const itemId = String(data.get("itemId") || "");
    const targetId = String(data.get("targetId") || "");
    const successMessage = String(data.get("successMessage") || "").trim();

    const entityIds = new Set(
      state.builderDraft.entities.map((entity) => entity.id),
    );

    if (!entityIds.has(itemId) || !entityIds.has(targetId)) {
      state.builderNotice = "Select valid trigger entities.";
      renderCreate();
      return;
    }

    if (!successMessage) {
      state.builderNotice = "A success message is required.";
      renderCreate();
      return;
    }

   setBuilderDraft(
  updateRule(state.builderDraft, ruleId, {
    trigger: {
      type: "use",
      itemId,
      targetId,
    },
    successMessage,
  }),
);

    state.builderNotice = "Rule saved successfully.";
    renderCreate();
    return;
  }

  if (event.target.matches(".condition-card")) {
    event.preventDefault();

    const form = event.target;
    const index = Number(form.dataset.conditionIndex);
    const data = new FormData(form);
    const op = String(data.get("op") || "");

    const allowedOperations = [
      "flag-equals",
      "entity-location-is",
      "entity-property-equals",
      "room-is",
    ];

    if (!allowedOperations.includes(op)) return;

    let condition = { op };

    if (op === "flag-equals") {
      condition.flag = String(data.get("flag") || "").trim();

      try {
        condition.value = JSON.parse(String(data.get("value")));
      } catch {
        state.builderNotice =
          'Invalid JSON value. Example: false, 5, or "open".';
        renderCreate();
        return;
      }

      if (!condition.flag) {
        state.builderNotice = "Enter a flag name.";
        renderCreate();
        return;
      }
    }

    if (op === "entity-location-is") {
      condition.entityId = String(data.get("entityId") || "");
      condition.location = String(data.get("location") || "");

      const validLocation =
        condition.location === "inventory" ||
        state.builderDraft.rooms.some((room) => room.id === condition.location);

      const validEntity = state.builderDraft.entities.some(
        (entity) => entity.id === condition.entityId,
      );

      if (!validEntity || !validLocation) {
        state.builderNotice = "Select a valid entity and location.";
        renderCreate();
        return;
      }
    }

    if (op === "entity-property-equals") {
      condition.entityId = String(data.get("entityId") || "");
      condition.property = String(data.get("property") || "").trim();

      try {
        condition.value = JSON.parse(String(data.get("value")));
      } catch {
        state.builderNotice =
          'Invalid JSON value. Example: false, 5, or "open".';
        renderCreate();
        return;
      }

      const validEntity = state.builderDraft.entities.some(
        (entity) => entity.id === condition.entityId,
      );

      if (!validEntity || !condition.property) {
        state.builderNotice = "Select an entity and enter a property name.";
        renderCreate();
        return;
      }
    }

    if (op === "room-is") {
      condition.roomId = String(data.get("roomId") || "");

      const validRoom = state.builderDraft.rooms.some(
        (room) => room.id === condition.roomId,
      );

      if (!validRoom) {
        state.builderNotice = "Select a valid room.";
        renderCreate();
        return;
      }
    }
setBuilderDraft(
  updateCondition(
    state.builderDraft,
    state.editingRuleId,
    index,
    condition,
  ),
);

    state.builderNotice = "Condition saved.";
    renderCreate();
    return;
  }

if (event.target.matches(".effect-card")) {
  event.preventDefault();

  const form = event.target;
  const index = Number(form.dataset.effectIndex);
  const data = new FormData(form);
  const op = String(data.get("op") || "");

  const allowedOperations = [
    "set-flag",
    "set-entity-property",
    "move-entity"
  ];

  if (!allowedOperations.includes(op)) return;

  let effect = { op };

  // SET GAME FLAG
  if (op === "set-flag") {
    effect.flag = String(data.get("flag") || "").trim();

    try {
      effect.value = JSON.parse(String(data.get("value")));
    } catch {
      state.builderNotice =
        'Invalid JSON value. Example: false, 5, or "open".';
      renderCreate();
      return;
    }

    if (!effect.flag) {
      state.builderNotice = "Enter a flag name.";
      renderCreate();
      return;
    }
  }

  // SET ENTITY PROPERTY
  if (op === "set-entity-property") {
    effect.entityId = String(data.get("entityId") || "");
    effect.property = String(data.get("property") || "").trim();

    try {
      effect.value = JSON.parse(String(data.get("value")));
    } catch {
      state.builderNotice =
        'Invalid JSON value. Example: false, 5, or "open".';
      renderCreate();
      return;
    }

    const validEntity = state.builderDraft.entities.some(
      (entity) => entity.id === effect.entityId
    );

    if (!validEntity || !effect.property) {
      state.builderNotice =
        "Select an entity and enter a property name.";
      renderCreate();
      return;
    }
  }

  // MOVE ENTITY
  if (op === "move-entity") {
    effect.entityId = String(data.get("entityId") || "");
    effect.location = String(data.get("location") || "");

    const validEntity = state.builderDraft.entities.some(
      (entity) => entity.id === effect.entityId
    );

    const validLocation =
      effect.location === "inventory" ||
      state.builderDraft.rooms.some(
        (room) => room.id === effect.location
      );

    if (!validEntity || !validLocation) {
      state.builderNotice =
        "Select a valid entity and destination.";
      renderCreate();
      return;
    }
  }

  setBuilderDraft(
  updateEffect(
    state.builderDraft,
    state.editingRuleId,
    index,
    effect,
  ),
);

  state.builderNotice = "Effect saved.";
  renderCreate();
  return;
}

});
app.addEventListener("change", (event) => {
  if (event.target.matches(".condition-card select[name='op']")) {
    const form = event.target.closest(".condition-card");
    const index = Number(form.dataset.conditionIndex);
    const op = event.target.value;

    const defaults = {
      "flag-equals": {
        op,
        flag: "",
        value: true,
      },
      "entity-location-is": {
        op,
        entityId: "",
        location: "inventory",
      },
      "entity-property-equals": {
        op,
        entityId: "",
        property: "",
        value: true,
      },
      "room-is": {
        op,
        roomId: "",
      },
    };

   setBuilderDraft(
  updateCondition(
    state.builderDraft,
    state.editingRuleId,
    index,
    defaults[op],
  ),
);

    renderCreate();
  }

  if (!event.target.matches("[data-effect-op]")) return;

  const form = event.target.closest(".effect-card");

  if (!form) return;

  const index = Number(form.dataset.effectIndex);
  const operation = event.target.value;
  const ruleId = state.editingRuleId;

  let newEffect;

  switch (operation) {
    case "set-flag":
      newEffect = {
        op: "set-flag",
        flag: "",
        value: true
      };
      break;

    case "set-entity-property":
      newEffect = {
        op: "set-entity-property",
        entityId: "",
        property: "",
        value: true
      };
      break;

    case "move-entity":
      newEffect = {
        op: "move-entity",
        entityId: "",
        location: ""
      };
      break;

    default:
      return;
  }

  setBuilderDraft(
  updateEffect(
    state.builderDraft,
    ruleId,
    index,
    newEffect,
  ),
);

  state.builderNotice = "Effect type changed.";
  renderCreate();
});
app.addEventListener("change", async (event) => {
if (event.target.matches("#game-world-import-input")) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) return;

  await startImportedGame(file);

  input.value = "";
  return;
}

  if (!event.target.matches("#world-import-input")) return;

  const input = event.target;
  const file = input.files?.[0];

  if (!file) return;

  const confirmed = window.confirm(
    "Importing this world will replace your current builder draft. Continue?"
  );

  if (!confirmed) {
    input.value = "";
    return;
  }

  try {
    const importedDraft = await importWorldFromZip(file);

    setBuilderDraft(importedDraft);

    // Reset editor selections to match the imported world.
    state.editingRoomId =
      importedDraft.manifest.startRoomId ||
      importedDraft.rooms[0]?.id ||
      null;

    state.editingEntityId = null;
    state.editingRuleId = null;
    state.editingConditionIndex = null;

    state.builderNotice = "World imported successfully.";
  } catch (error) {
    console.error("World import failed:", error);

    state.builderNotice = `Import failed: ${error.message}`;
  }

  input.value = "";
  renderCreate();
});

render();
