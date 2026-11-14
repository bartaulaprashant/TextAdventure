# Text Adventure Engine & World Builder

A browser-based, data-driven text adventure game engine inspired by
classic interactive fiction such as **Zork**. The project combines a
playable text-adventure runtime with an in-browser world builder,
allowing people to create, save, export, import, and play custom worlds
without writing engine code for every adventure.

The project is intentionally built around a separation between **the
engine** and **the world data**. The engine provides reusable mechanics;
each world supplies its rooms, objects, rules, messages, and starting
point as structured JSON.

> **Project status:** Functional prototype / personal portfolio project.
> The core gameplay loop, a sample world, a browser-based builder, local
> draft persistence, and ZIP-based world export/import have been
> implemented. Some areas---especially validation depth, testing
> coverage, accessibility, security hardening, and larger-world
> tooling---can be strengthened in future iterations.

## Live url: https://wild-textadventure.netlify.app/

------------------------------------------------------------------------

## Contents

-   [What this project does](#what-this-project-does)
-   [Highlights](#highlights)
-   [How it works](#how-it-works)
-   [Project architecture](#project-architecture)
-   [World data format](#world-data-format)
-   [Core gameplay capabilities](#core-gameplay-capabilities)
-   [World Builder capabilities](#world-builder-capabilities)
-   [Saving, exporting, and importing
    worlds](#saving-exporting-and-importing-worlds)
-   [Getting started](#getting-started)
-   [Creating and playing a world](#creating-and-playing-a-world)
-   [Example use cases](#example-use-cases)
-   [Strengths](#strengths)
-   [Current limitations and
    weaknesses](#current-limitations-and-weaknesses)
-   [Future extensibility](#future-extensibility)
-   [Helpful development tips](#helpful-development-tips)
-   [Suggested roadmap](#suggested-roadmap)
-   [Contributing and project
    direction](#contributing-and-project-direction)

------------------------------------------------------------------------

## What this project does

The application provides two connected experiences:

1.  **World Builder** --- create and edit an adventure using forms
    instead of manually writing all the JSON files.
2.  **Game Engine** --- play a built-in world or import a custom world
    from a ZIP archive.

A world is represented by data files rather than hard-coded screens or
one-off game logic. The engine reads that data and interprets it at
runtime.

The included sample adventure is **The Forgotten Cellar**. It
demonstrates a small exploration-and-puzzle scenario involving rooms,
exits, portable objects, inventory, and a key-and-door interaction.

### Design goals

-   Keep world content separate from engine implementation.
-   Make the engine reusable across multiple adventures.
-   Make world creation approachable through a visual builder.
-   Use structured, inspectable JSON rather than executable scripts
    inside world packages.
-   Allow a world to be exported and transferred as a ZIP file.
-   Keep the initial project small enough to understand, maintain, and
    extend incrementally.

------------------------------------------------------------------------

## Highlights

-   Browser-based text-adventure interface with a terminal-inspired
    visual style.
-   Data-driven rooms, exits, entities, messages, and interaction rules.
-   Command handling for core adventure actions.
-   Room navigation with conditional exit requirements.
-   Inventory and portable-object handling.
-   Rule evaluation using explicit conditions and effects.
-   World Builder for editing world metadata, rooms, entities, and
    rules.
-   Automatic local draft saving through browser storage, with manual
    save and clear controls.
-   ZIP export and import for moving worlds between the Builder and the
    game.
-   A reusable game-session layer that can start from either a bundled
    world or an already-loaded world object.
-   Modular JavaScript code organized around engine and builder
    responsibilities.

------------------------------------------------------------------------

## How it works

At a high level, the application follows this flow:

``` text
                 WORLD BUILDER
                       |
             Create / edit world data
                       |
                 Save local draft
                       |
                  Export ZIP
                       |
                       v
                 ZIP ARCHIVE
                       |
                 Import ZIP
                       |
                       v
              Read the JSON files
                       |
                Validate the world
                       |
                       v
                 GAME SESSION
                       |
              Parse player commands
                       |
             Resolve rooms and objects
                       |
             Evaluate rules and effects
                       |
                Update game state
                       |
                 Render response
```

The engine does not need a separate JavaScript implementation for every
world. Instead, it interprets the data supplied by the world package.

### Engine and world data are separate

This separation is one of the project's most important architectural
decisions.

-   **Engine code** defines what the game can do: parse commands, move
    between rooms, resolve entities, evaluate rules, and update state.
-   **World data** defines what happens in a particular adventure: which
    rooms exist, which objects are present, which exits are available,
    and which rules connect player actions to outcomes.

For example, a key unlocking a door is represented as a rule in the
world data. The engine evaluates that rule; it does not need a special
`unlockCellarDoor()` function tied to that particular world.

------------------------------------------------------------------------

## Project architecture

The exact file names may evolve as the project grows. The following is a
conceptual map of the current organization.

``` text
project/
├── public/
│   └── worlds/
│       └── forgotten-cellar/
│           ├── manifest.json
│           ├── rooms.json
│           ├── entities.json
│           ├── rules.json
│           └── text.json
│
├── src/
│   ├── engine/
│   │   ├── worldLoader.js
│   │   ├── worldValidator.js
│   │   ├── state.js
│   │   ├── navigation.js
│   │   ├── command-parser.js
│   │   ├── entity-resolver.js
│   │   ├── actions.js
│   │   ├── ruleEvaluator.js
│   │   └── gameSession.js
│   │
│   ├── builder/
│   │   ├── world-draft.js
│   │   ├── world-export.js
│   │   └── world-import.js
│   │
│   ├── main.js
│   └── style.css
│
├── index.html
└── package.json
```

This tree is intended as an architectural guide, not a guarantee that
every filename or spelling is identical in every working copy.

### Engine modules

  -----------------------------------------------------------------------
  Module                              Responsibility
  ----------------------------------- -----------------------------------
  `worldLoader.js`                    Loads a bundled world from the
                                      public worlds directory and passes
                                      it through validation.

  `worldValidator.js`                 Checks world structure, IDs,
                                      references, supported rule
                                      operations, and other required
                                      data.

  `state.js`                          Creates the initial runtime state
                                      from the world definition.

  `navigation.js`                     Handles room exits and their
                                      requirements.

  `command-parser.js`                 Interprets supported player command
                                      patterns.

  `entity-resolver.js`                Finds entities by their
                                      identifiers, names, or aliases in
                                      the relevant context.

  `actions.js`                        Dispatches parsed commands and
                                      coordinates game actions.

  `ruleEvaluator.js`                  Checks rule conditions and applies
                                      supported effects.

  `gameSession.js`                    Creates and exposes a game session,
                                      including current room, inventory,
                                      suggestions, state, and command
                                      execution.
  -----------------------------------------------------------------------

### Builder modules

  -----------------------------------------------------------------------
  Module                              Responsibility
  ----------------------------------- -----------------------------------
  `world-draft.js`                    Creates and updates the editable
                                      world draft and its rooms,
                                      entities, rules, conditions, and
                                      effects.

  `world-export.js`                   Packages world data into a
                                      downloadable ZIP archive.

  `world-import.js`                   Reads a ZIP archive and
                                      reconstructs a world object from
                                      its JSON files.
  -----------------------------------------------------------------------

### Application shell

`main.js` connects the interface to the builder and engine. It manages
page rendering, event handling, current game session, and builder state.

`style.css` contains the visual presentation, including the retro
terminal-inspired theme.

------------------------------------------------------------------------

## World data format

A world is composed of five JSON files.

  -----------------------------------------------------------------------
  File                                Purpose
  ----------------------------------- -----------------------------------
  `manifest.json`                     World identity and metadata,
                                      including its ID, title, version,
                                      and starting room ID.

  `rooms.json`                        Room descriptions, exits, and
                                      optional exit requirements.

  `entities.json`                     Objects and other interactable
                                      entities, including their initial
                                      locations and properties.

  `rules.json`                        Triggers, conditions, effects, and
                                      success messages for interactions.

  `text.json`                         Introductory text and reusable game
                                      messages.
  -----------------------------------------------------------------------

### 1. `manifest.json`

The manifest identifies the world and tells the engine where the
adventure begins.

Conceptually:

``` json
{
  "id": "forgotten-cellar",
  "title": "The Forgotten Cellar",
  "version": "1.0.0",
  "startRoomId": "house-exterior"
}
```

The bundled-world loader also uses a `files` object to locate the JSON
files in the public world directory. The in-memory imported-world flow
uses the five files read from the ZIP archive and passes the resulting
object to the game-session creator.

### 2. `rooms.json`

Rooms describe locations and how the player can travel between them.

Conceptually:

``` json
[
  {
    "id": "living-room",
    "name": "Living Room",
    "description": "Dust covers the furniture. A heavy door leads down.",
    "exits": {
      "down": "cellar"
    },
    "exitRequirements": {
      "down": [
        {
          "op": "entity-property-equals",
          "entityId": "cellar-door",
          "property": "unlocked",
          "value": true
        }
      ]
    }
  }
]
```

An exit can therefore be more than a direct connection. It can be
conditional on the current game state.

### 3. `entities.json`

Entities represent objects the player can see, examine, carry, or use.

A simplified example:

``` json
[
  {
    "id": "rusty-key",
    "name": "Rusty Key",
    "aliases": ["key", "old key"],
    "initialLocation": "living-room",
    "portable": true,
    "properties": {}
  }
]
```

The exact fields accepted by a world are determined by the current
validator and engine implementation. Consult the existing sample world
when creating data manually.

### 4. `rules.json`

Rules define how interactions change the world.

A simplified example based on the sample door puzzle:

``` json
[
  {
    "id": "unlock-cellar-door",
    "trigger": {
      "type": "use",
      "itemId": "rusty-key",
      "targetId": "cellar-door"
    },
    "conditions": [
      {
        "op": "entity-location-is",
        "entityId": "rusty-key",
        "location": "inventory"
      },
      {
        "op": "entity-property-equals",
        "entityId": "cellar-door",
        "property": "unlocked",
        "value": false
      }
    ],
    "effects": [
      {
        "op": "set-entity-property",
        "entityId": "cellar-door",
        "property": "unlocked",
        "value": true
      }
    ],
    "successMessage": "The rusty key turns with a grinding click. The cellar door unlocks."
  }
]
```

The current engine uses a controlled set of operations rather than
evaluating arbitrary JavaScript from world files.

Current condition operations:

-   `flag-equals`
-   `entity-location-is`
-   `entity-property-equals`
-   `room-is`

Current effect operations:

-   `set-flag`
-   `set-entity-property`
-   `move-entity`

The current example rule trigger supports `use`, with an item and target
entity.

### 5. `text.json`

This file contains the world intro and reusable messages, such as
messages for invalid directions, missing rooms, or loading failures.

Use the current sample world and validator as the definitive reference
for required fields and accepted structures.

------------------------------------------------------------------------

## Core gameplay capabilities

The current engine provides the foundations of a classic command-driven
adventure:

-   **Movement:** travel through exits defined by the current room.
-   **Conditional navigation:** prevent movement until specified
    conditions are satisfied.
-   **Looking and inspection:** inspect the current environment and
    examine visible entities.
-   **Inventory:** collect portable objects and keep track of carried
    entities.
-   **Using objects:** use an inventory item on a target entity to
    trigger a matching rule.
-   **State changes:** update flags, entity properties, and entity
    locations.
-   **Suggested commands:** display useful commands based on the current
    room, visible entities, inventory, and available rules.

The command parser and rule evaluator are deliberately separate. This
makes it easier to extend the vocabulary of commands without rewriting
the rule system, and to add new rule operations without turning the
interface into a collection of hard-coded puzzle handlers.

------------------------------------------------------------------------

## World Builder capabilities

The Builder provides a graphical interface for editing the data that
makes up an adventure.

Current capabilities include:

-   Editing world metadata.
-   Creating and editing rooms.
-   Defining room exits.
-   Creating and editing entities.
-   Defining entity properties and initial locations.
-   Creating rules with supported triggers.
-   Adding, editing, and deleting rule conditions.
-   Adding, editing, and deleting rule effects.
-   Saving the current draft in browser storage automatically.
-   Manually saving or clearing the local draft.
-   Exporting a world as a ZIP archive.
-   Importing a ZIP archive into the Builder.

The Builder is intended to make world data easier to author. It does not
yet provide every feature a full game-authoring environment would need.

------------------------------------------------------------------------

## Saving, exporting, and importing worlds

### Local draft persistence

The Builder stores its current draft in the browser's `localStorage`.

This allows the user to close or reload the page without immediately
losing the draft. Manual save and clear controls are also available.

**Important:** `localStorage` is browser- and origin-specific. It is not
cloud storage, is not automatically synchronized across devices, and can
be cleared by browser settings or the user. Export important work
regularly.

### ZIP export

The Builder packages the world JSON files into a ZIP archive. This is
useful for:

-   Backing up a world.
-   Moving a world to another computer.
-   Sharing a world with another person.
-   Keeping versioned copies of an adventure.
-   Importing a world into the Play experience.

### ZIP import into the game

The Play page accepts a ZIP world package. The application reads the
JSON files from the archive, creates a world object, validates it, and
starts a game session from that object.

The imported world is currently held in memory while the page is
running. It is not automatically installed as a permanent bundled world
or saved as a persistent game library entry.

### ZIP import into the Builder

The Builder also has its own import flow. It reads the archive and
replaces the current draft after confirmation.

Be careful: importing into the Builder replaces the current draft.
Export or back up work before replacing it.

------------------------------------------------------------------------

## Getting started

### Requirements

-   Node.js and npm.
-   A modern browser.
-   A local development environment capable of running the project's
    Vite development server.

The project uses JavaScript modules and Vite. JSZip is used for ZIP
archive handling. Vitest has been used for engine tests.

### Install dependencies

Clone or download the repository, open a terminal in the project
directory, and run:

``` bash
npm install
```

### Start the development server

If the project retains the standard Vite development script:

``` bash
npm run dev
```

Open the local URL printed by Vite in your browser.

### Other useful commands

The exact scripts are defined in `package.json`. If configured, typical
commands may include:

``` bash
npm run build
npm run preview
npm test
```

Check `package.json` before relying on a command; script names can vary
between project versions.

------------------------------------------------------------------------

## Creating and playing a world

A typical workflow is:

1.  Open the **Create** page.
2.  Enter a world ID, title, version, and starting room.
3.  Create rooms and describe what the player can see.
4.  Connect rooms using exits.
5.  Create entities and choose their initial locations.
6.  Add rules that respond to supported interactions.
7.  Add conditions to control when a rule can run.
8.  Add effects to describe how the world changes.
9.  Save the draft or allow automatic local saving to preserve progress.
10. Export the world as a ZIP archive.
11. Open the **Play** page.
12. Import the ZIP archive and start the adventure.

For a first custom world, keep the design small. A few connected rooms,
a handful of objects, and one or two puzzles are enough to exercise the
main engine features.

------------------------------------------------------------------------

## Example use cases

Although the project is inspired by classic text adventures, the
underlying data-driven approach can support several kinds of
experiences.

### 1. Classic interactive fiction

Create exploration-focused stories with rooms, descriptions, objects,
locked paths, clues, and puzzle solutions.

### 2. Escape-room puzzles

Represent an escape room as a network of locations and interactable
objects. Use conditions and effects to track which puzzles have been
solved and which paths have become available.

### 3. Educational simulations

Build small scenario-based learning experiences. For example, a learner
could explore a virtual laboratory, inspect equipment, collect items,
and follow a sequence of safe, predefined interactions.

### 4. Interactive onboarding

Create a guided text-based environment that introduces a process,
product, or fictional system through exploration and command-driven
discovery.

### 5. Branching narrative prototypes

Use rooms and flags to prototype story branches and conditional access.
More advanced narrative features---such as dialogue trees, choices, and
timed events---would require additional engine support.

### 6. Game-design experiments

Use the Builder to test puzzle ideas and world layouts without first
creating a custom interface or backend for each experiment.

------------------------------------------------------------------------

## Strengths

### 1. Clear separation of engine and content

The engine is not tied to one adventure. A new world can be authored as
data rather than requiring a separate set of gameplay functions.

**Why this matters:** it demonstrates reusable architecture and makes
future content expansion more manageable.

### 2. Data-driven rule system

Conditions and effects let world authors describe interactions
declaratively. The engine evaluates the definitions at runtime.

**Why this matters:** adding another puzzle that uses already-supported
operations should mainly require new world data, not new engine code.

### 3. Modular engine responsibilities

World loading, validation, state creation, navigation, parsing, entity
resolution, actions, rule evaluation, and session management are
separated into focused modules.

**Why this matters:** individual systems can be improved without placing
all gameplay logic inside one large file.

### 4. A complete authoring-to-playing workflow

The Builder, local persistence, ZIP export, and ZIP import form a
practical content workflow rather than leaving world creation as a
manual JSON-only process.

### 5. Portable world packages

A ZIP archive is easy to store, copy, and share. It also avoids
requiring a server just to transfer a world between the Builder and the
game.

### 6. No mandatory backend for the current workflow

World creation, local draft storage, ZIP handling, and gameplay can run
in the browser. This keeps deployment and hosting requirements
relatively simple.

### 7. Good foundation for a portfolio project

The project demonstrates several useful engineering concepts in one
coherent application:

-   JavaScript modules and application state.
-   Data modeling and JSON schemas.
-   Command parsing.
-   Rule evaluation.
-   Separation of concerns.
-   Client-side persistence.
-   File import/export.
-   Dependency integration.
-   Automated testing foundations.
-   A small application with both an editor and a runtime.

------------------------------------------------------------------------

## Current limitations and weaknesses

These are known design boundaries and areas to improve---not reasons the
project is unsuccessful. Being clear about them helps keep future work
realistic.

### 1. Limited command vocabulary

The current command system supports a relatively small set of actions.
It is not yet a natural-language parser and may not understand different
phrasings of the same intent.

**Impact:** players must learn the supported command patterns. More
complex interactions may require extending the parser and resolver.

### 2. Limited rule operations

The rule evaluator supports a small set of condition and effect
operations. More advanced puzzles and narrative systems may need
additional operations.

**Impact:** world authors can only express interactions that the engine
knows how to evaluate.

### 3. Limited trigger types

The current example rule system focuses on `use` interactions with an
item and a target. Events such as entering a room, taking an object,
examining something, or selecting a dialogue option are not yet
general-purpose rule triggers.

### 4. Basic world-authoring experience

The Builder provides editing forms, but it is not yet a full visual
game-design environment.

Potential gaps include:

-   No visual map editor.
-   No drag-and-drop room connections.
-   No rich text editor for story content.
-   No advanced search or filtering for large worlds.
-   No undo/redo history.
-   No collaboration or multi-user editing.

### 5. Local-only draft storage

The current draft is stored in `localStorage`.

**Impact:** drafts do not automatically synchronize between browsers or
devices. Browser storage can also be cleared, and it is not suitable for
unlimited or very large projects.

### 6. Imported games are not a persistent library

An imported world can be played in the current page session, but the
project does not yet provide a permanent library of imported worlds or
automatic restoration after a browser reload.

### 7. No cloud accounts or multiplayer

There is no user-account system, server-side world storage, sharing
permission model, or multiplayer synchronization.

These are not necessary for the current single-player prototype, but
would become relevant if the project evolved into a hosted platform.

### 8. Validation and error handling can be expanded

The existing validator checks important world structure and references.
A more mature editor should also provide detailed, field-level feedback
before export and explain how to fix invalid data.

ZIP import can be hardened further with archive-size limits, file-size
limits, clearer malformed-archive handling, and explicit package-version
checks.

### 9. Testing coverage is not yet comprehensive

The project has engine tests, but a mature release should cover the
complete workflow, including Builder operations, rule editing, ZIP
round-trips, invalid imports, and browser interactions.

### 10. Accessibility and usability need continued attention

The terminal-inspired interface should still support keyboard
navigation, visible focus states, readable contrast, meaningful labels,
and assistive technologies. A command-driven interface should not be the
only way to discover available actions.

### 11. No rich media or advanced narrative presentation

The current experience is primarily text-based. Images, audio,
animations, dialogue interfaces, maps, and other presentation modes
would need additional data structures and rendering support.

------------------------------------------------------------------------

## Future extensibility

The project can grow in several directions. The best approach is to
extend the existing architecture rather than adding unrelated features
all at once.

### 1. Expand the rule engine

This is likely the most valuable engine-level extension.

Possible new triggers:

-   `enter-room`
-   `take-item`
-   `examine-entity`
-   `drop-item`
-   `talk-to`
-   `interact`

Possible new conditions:

-   `flag-exists`
-   `inventory-contains`
-   `inventory-count`
-   `entity-property-greater-than`
-   `entity-property-is`
-   `room-visited`
-   `all-conditions`
-   `any-condition`

Possible new effects:

-   `set-flag`
-   `increment-flag`
-   `decrement-flag`
-   `move-entity`
-   `add-entity`
-   `remove-entity`
-   `change-room-description`
-   `show-message`
-   `unlock-exit`
-   `end-game`

The exact operation names and data shapes should be designed
deliberately. Every new operation should have a corresponding validator
rule and automated tests.

### 2. Improve command interpretation

A richer command system could support:

-   More flexible command patterns.
-   Better handling of entity aliases.
-   Disambiguation when multiple objects have similar names.
-   Context-aware error messages.
-   Multi-word object names.
-   A help command that documents available actions.
-   Optional command history and keyboard navigation.

A useful next step would be to formalize a command grammar rather than
adding unrelated string checks to the parser.

### 3. Add a visual world map

A map editor could show rooms as nodes and exits as connections.

Potential capabilities:

-   Create rooms from the map.
-   Connect rooms visually.
-   Highlight unreachable rooms.
-   Display conditional exits.
-   Select a room to edit its properties.
-   Zoom and pan across larger maps.

The map should be another view of the same world data, not a separate
source of truth.

### 4. Add dialogue and characters

A dialogue system could introduce:

-   Non-player characters.
-   Dialogue nodes and choices.
-   Conditional dialogue options.
-   Dialogue effects that update flags or inventory.
-   Conversation history.
-   Character-specific interaction rules.

A dialogue system would make the engine suitable for narrative
adventures beyond object puzzles.

### 5. Add world and save-game versioning

As the world format evolves, older archives may no longer match the
latest structure.

A versioning system could provide:

-   Explicit world-format versions.
-   Import compatibility checks.
-   Migration functions for older world packages.
-   Export metadata.
-   Save-game compatibility checks.

Keep the world package version distinct from the application version.
They represent different things.

### 6. Add persistent game saves

A save-game system should store runtime state separately from the world
definition.

A save file might contain:

-   World ID and world version.
-   Current room ID.
-   Entity locations and changed properties.
-   Flags.
-   Turn count.
-   Other future runtime variables.

The game should validate that a save belongs to a compatible world
before restoring it.

### 7. Improve Builder productivity

Potential Builder improvements include:

-   Undo and redo.
-   Duplicate room/entity/rule.
-   Search and filtering.
-   Room and entity reference pickers.
-   Rule templates.
-   Validation messages next to fields.
-   Preview mode.
-   Import/export of individual components.
-   World statistics and reference reports.

### 8. Add a world library

A local world library could list imported and created adventures, with
options to:

-   Open a world in the Builder.
-   Start playing a world.
-   Rename or duplicate a world.
-   Export a backup.
-   Remove a world from the library.

IndexedDB would be a more suitable browser storage option than
`localStorage` for larger collections of worlds.

### 9. Add optional backend support

A backend is not required for the current architecture. If online
sharing becomes a goal, a backend could later provide:

-   User accounts.
-   Cloud world storage.
-   Public and private worlds.
-   Sharing links.
-   Version history.
-   Community-published adventures.
-   Ratings and comments.

The engine should remain capable of playing a local world package even
if a hosted service is introduced.

### 10. Add optional presentation systems

The data model could eventually support:

-   Room images.
-   Character portraits.
-   Ambient sound.
-   Music and sound effects.
-   Rich formatted descriptions.
-   Animated transitions.
-   A visual map during gameplay.

These should be optional world features so simple text-only worlds
remain lightweight.

------------------------------------------------------------------------

## Helpful development tips

### Keep the engine independent of the Builder

The game engine should not need to know whether a world came from the
Builder, a ZIP file, or the bundled public directory.

A good boundary is:

``` text
World source
    |
    v
Load or import world data
    |
    v
Validate world
    |
    v
Create game session
    |
    v
Run the game
```

The session should receive a world object, not a file input or a ZIP
archive.

### Treat world JSON as data, never as executable code

Continue using a controlled set of supported condition and effect
operations. Avoid evaluating JavaScript stored inside a world package.

This keeps world packages easier to inspect and reduces the risks
associated with importing untrusted content.

### Keep IDs stable

Use stable IDs for rooms, entities, and rules. Descriptions and display
names can change, but references depend on IDs.

For example, changing a room's name should not require changing every
exit that points to its ID.

### Update validation when the data model changes

Whenever a new field, trigger, condition, or effect is introduced:

1.  Define its expected structure.
2.  Add validator checks.
3.  Implement its runtime behavior.
4.  Add tests for valid and invalid cases.
5.  Update the Builder if authors need to edit it.
6.  Update this documentation and the world-format version when
    appropriate.

### Avoid putting all behavior into `main.js`

The application shell should coordinate the UI. Core game rules belong
in engine modules; world-editing operations belong in Builder modules.

As the project grows, consider extracting page rendering and event
handling into smaller modules.

### Test the data engine separately from the interface

Engine tests should cover parsing, navigation, entity resolution, rules,
state changes, and sessions without requiring a browser UI.

UI tests can then focus on forms, buttons, file selection, and
rendering.

### Keep sample worlds as living examples

The Forgotten Cellar should remain a small, understandable reference
world. When adding a new engine capability, consider updating the sample
world to demonstrate it.

### Export backups regularly

Local draft saving is convenient, but it is not a backup strategy.
Export ZIP copies at meaningful milestones and keep important versions
somewhere outside the browser.

### Prefer small, coherent changes

When extending the project, complete one vertical slice at a time. For
example, a new trigger should be implemented across the data model,
validator, evaluator, Builder, tests, and documentation before moving to
another unrelated feature.

------------------------------------------------------------------------

## Suggested roadmap

This is a possible future sequence, not a requirement to implement
everything.

  -----------------------------------------------------------------------
  Stage                   Focus                   Outcome
  ----------------------- ----------------------- -----------------------
  1                       Stabilize current       Reliable Builder,
                          workflow                save/restore, ZIP
                                                  import/export, and game
                                                  startup.

  2                       Improve validation and  Clear errors and
                          tests                   confidence that
                                                  malformed worlds do not
                                                  break sessions.

  3                       Expand command system   More flexible commands
                                                  and better entity
                                                  disambiguation.

  4                       Expand rules            More triggers,
                                                  conditions, and effects
                                                  for richer puzzles.

  5                       Improve Builder UX      Better references,
                                                  previews, undo/redo,
                                                  and world organization.

  6                       Add world map           Visual room layout and
                                                  exit editing.

  7                       Add save games          Restore player progress
                                                  independently of world
                                                  definitions.

  8                       Add narrative systems   Characters, dialogue,
                                                  choices, and branching
                                                  story content.

  9                       Add optional cloud      Accounts, online
                          features                storage, and world
                                                  sharing if the project
                                                  needs them.
  -----------------------------------------------------------------------

A sensible priority is to make the current engine and authoring workflow
dependable before adding a large number of new features.

------------------------------------------------------------------------

## Contributing and project direction

The project is currently best understood as a modular, client-side
text-adventure engine and authoring prototype.

When making changes:

-   Preserve the separation between engine code and world content.
-   Keep world files valid JSON.
-   Use stable IDs for references.
-   Keep supported operations explicit and documented.
-   Validate imported data before creating a session.
-   Avoid silently discarding a user's current Builder draft.
-   Add tests when changing core engine behavior.
-   Update the sample world and documentation when introducing new
    capabilities.

## Final note

The most valuable part of this project is not simply that it can run a
text adventure. It is that it has the beginnings of a **reusable
content-driven engine and a separate authoring workflow**.

That gives it room to evolve from a small Zork-inspired prototype into a
more capable interactive-fiction toolkit---without requiring every new
adventure to be built from scratch.
