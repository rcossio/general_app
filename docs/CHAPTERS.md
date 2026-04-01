# Chapter Design Guide

This document is for designers and writers creating adventure chapters. It covers the full JSON format and everything the engine can do.

---

## The big picture

A chapter is a JSON file describing a set of **locations** on a real-world map. Players walk to locations with their phone. When they get close enough, the app lets them interact. Interactions can give the player **flags** — invisible tokens that track story progress. Flags control what the player sees next and whether new locations appear on the map.

The engine is entirely flag-driven. There are no hit points, timers, or inventories — only flags and locations.

---

## File structure

```json
{
  "title": {
    "en": "The Garden",
    "it": "Il Giardino",
    "es": "El Jardín"
  },
  "items": [ ... ],
  "locations": [ ... ]
}
```

`title` is the chapter name shown in the app. All text fields support any combination of `en`, `it`, `es`. No language is required — define only the ones you have. The app falls back to the first available language when the player's locale is missing.

`items` defines the chapter's inventory — see **Items** below. Use `[]` if the chapter has no inventory.

### Image URLs

`imageUrl` fields accept either a full URL (`https://...`) or a relative R2 key (`game-art/foo.webp`). The import script resolves relative keys to full public URLs using `NEXT_PUBLIC_R2_PUBLIC_URL`. Store assets in R2 and reference them by key.

`imageUrl` can appear at **two levels**:

- **Location-level** — default image for the location, shown regardless of state.
- **Value-level** — overrides the location image when that specific value fires. Useful for showing a different image depending on the player's flags (e.g. a door open vs closed).

Resolution order: value-level `imageUrl` → location-level `imageUrl` → default image.

---

## Items

`items` is a top-level array on the chapter JSON. Each item represents something the player can carry. An item appears in the player's inventory (backpack button → bottom bar) when they hold the item's associated flag.

```json
"items": [
  {
    "id": "key",
    "flag": "has_key",
    "name": { "en": "Rusty Key", "it": "Chiave Arrugginita", "es": "Llave Oxidada" },
    "imageUrl": null,
    "itemImageUrl": null
  },
  {
    "id": "note",
    "flag": "has_note",
    "name": { "en": "Note", "it": "Biglietto", "es": "Nota" },
    "imageUrl": null,
    "itemImageUrl": {
      "en": "game-art/note_en_600x400.webp",
      "it": "game-art/note_it_600x400.webp",
      "es": "game-art/note_es_600x400.webp"
    }
  }
]
```

| Field | Required | Description |
|---|---|---|
| `id` | yes | Unique string within the items array. |
| `flag` | yes | The player must hold this flag for the item to appear in inventory. |
| `name` | yes | Display name shown in the inventory list. Multilingual. |
| `imageUrl` | yes | Reserved field — use `null` for now. |
| `itemImageUrl` | yes | Full-screen image shown when the player taps the item. Multilingual (per-locale image path). Use `null` for no image. When provided, the item is tappable in inventory. |

Items are defined once per chapter — not per location. To give a player an item, grant its flag from a location (via `grants`, `choices`, or `password`). Items are never removed from inventory — they persist as long as the player holds the flag.

---

## Location object

Every entry in `locations` is either a **location** or an **event** (see `type` below). The full set of fields:

```json
{
  "id": "loc_1_start",
  "type": "location",
  "name": { "en": "Notice Board", "it": "Bacheca degli Avvisi", "es": "Tablón de Anuncios" },
  "coordinates": [45.01582, 8.62813],
  "radiusM": 50,
  "imageUrl": "game-art/notice_board.webp",
  "visibleWhen": null,
  "values": [ ... ],
  "grants": [{ "flag": "visited_start" }]
}
```

| Field | Required | Default | Description |
|---|---|---|---|
| `id` | yes | — | Unique string within the chapter. Used internally to reference this location. |
| `type` | no | `"location"` | `"location"` or `"event"`. Controls app behaviour (see below). |
| `name` | yes | — | Name shown in the sheet and on the map. Multilingual object. |
| `coordinates` | yes | — | GPS position. Accepts `[lat, lng]` array (preferred — paste directly from Google Maps) or `{ "lat": N, "lng": N }` object. |
| `radiusM` | no | 35 | Radius in metres. Player must be within this distance to interact. Omit for the default 35m, which works well for typical GPS accuracy outdoors. Use smaller values (20–25m) for tightly-spaced locations or larger values (50–100m+) for wide areas like parks or plazas. |
| `imageUrl` | no | `null` | Image shown at the top of the sheet. Full URL or relative R2 key. Uses a default image if omitted. Can be overridden per-value (see Image URLs above). |
| `visibleWhen` | yes | — | Condition controlling when this location appears on the map (see Conditions). Use `null` for always visible. |
| `values` | yes | — | Array of narrative entries evaluated top-to-bottom (see Values). |
| `grants` | no | `[]` | Flags given to the player unconditionally when they close the location. Omit if none. |
| `revokes` | no | `[]` | Flags removed from the player unconditionally when they close the location. Omit if none. |
| `initialLocation` | no | `false` | Marks the intended starting point of the chapter. Only one location per chapter should have this. When Fake GPS mode is active, a **Start** button appears on the D-pad that teleports the player to 100 m south of this location — just outside the radius, ready to walk in. |

### type: "location" vs "event"

**location** (default)
- Shown on the map as an orange circle (unvisited) or light orange (visited).
- When the player enters the radius, a green hint bar appears at the bottom of the screen.
- The player taps the hint bar (or the map marker) to open the information sheet.
- The player must act before they can dismiss the sheet (sheet is locked until they interact).

**event**
- Shown on the map identically to locations (orange circle).
- When the player enters the radius the information sheet opens **automatically** — no tap needed.
- Used for triggered story beats that the player cannot choose to ignore.
- The sheet is locked until the player interacts.

---

## Values — narrative entries

`values` is an array of objects evaluated from top to bottom. The first entry whose `when` condition matches the player's current flags is the one shown.

```json
"values": [
  {
    "when": "has_key",
    "content": {
      "en": "The shed is empty. You already took the key.",
      "it": "Il capanno è vuoto. Hai già preso la chiave.",
      "es": "El cobertizo está vacío. Ya tomaste la llave."
    }
  },
  {
    "when": null,
    "content": {
      "en": "A rusty key hangs on the wall.",
      "it": "Una chiave arrugginita è appesa al muro.",
      "es": "Una llave oxidada cuelga de la pared."
    }
  }
]
```

Every `values` array should end with a `"when": null` entry as the default fallback.

### Value fields

| Field | Required | Description |
|---|---|---|
| `when` | yes | Condition that must be true to use this entry. `null` always matches. |
| `content` | yes | Narrative text shown to the player. Multilingual object. |
| `completesChapter` | no | Set to `true` on the value that ends the chapter. Triggers the completion banner. |
| `choices` | no | Presents the player with decision buttons (see Choices). |
| `password` | no | Locks the location behind a code the player must enter (see Passwords). |
| `imageUrl` | no | Overrides the location-level image when this value fires. |
| `grants` | no | Flags given only when this specific value fires (conditional grants). |
| `revokes` | no | Flags removed only when this specific value fires (conditional revokes). |

---

## Conditions

Conditions appear in `visibleWhen` and `values[].when`. They control visibility and narrative selection.

| Value | Meaning |
|---|---|
| `null` | Always true. |
| `"flag_name"` | True if the player has this flag. |
| `{ "and": ["flag_a", "flag_b"] }` | True if the player has **all** listed flags. |
| `{ "or": ["flag_a", "flag_b"] }` | True if the player has **at least one** listed flag. |
| `{ "not": "flag_name" }` | True if the player does **not** have this flag. |

Conditions can be nested:

```json
{ "and": ["visited_start", { "not": "dog_chased" }] }
```

---

## Grants and revokes

Grants and revokes can be defined at **two levels**. Both are optional — omit them entirely when there are no flags to change.

### Location-level (unconditional)

Applied by the close endpoint regardless of which value matched. Use for flags that should always be set when the player finishes interacting (e.g. `visited_start`).

```json
"grants": [{ "flag": "visited_start" }]
```

### Value-level (conditional)

Applied only when that specific value entry fires. Use when the effect depends on the player's state — e.g. a value that revokes a callback flag, or an event that only removes a companion flag when the player has one.

```json
{
  "when": "has_friend",
  "content": { "en": "The dog chases your friend away." },
  "grants": [{ "flag": "dog_chased" }],
  "revokes": [{ "flag": "has_friend" }]
}
```

### Which level to use?

- **Always fires** → location-level (e.g. `visited_x` tracking flags).
- **Depends on state** → value-level (e.g. granting an item only on first visit, callback flags from choices/passwords).
- Both can coexist on the same location. Location-level grants fire first, then value-level.

> Flags granted via `choices` or `password` are defined inside those objects, not at either level above.

---

## Choices

When a value entry has `choices`, the player sees decision buttons instead of a simple Done button. They must pick one. The choice is final — they cannot go back.

Choices use a **callback flag** pattern. Each choice grants a temporary callback flag. A separate `value` entry — placed **above** the choices value — matches the callback flag and displays the outcome text.

### Step-by-step flow

1. Player enters location → visit status is set to `open` → sheet shows the value with `choices`.
2. Player picks a choice → POST /visit with `choiceId` → grants the callback flag (e.g. `shed_choice_grab`).
3. Client refreshes → now the callback value (e.g. `when: "shed_choice_grab"`) matches → sheet shows the outcome text.
4. Player presses "Done" → POST /close → applies callback value's grants (permanent flags) and revokes (removes callback flag), sets status to `closed`.
5. On next visit → status reopens to `open` → permanent flags determine which value matches.

### JSON structure

```json
{
  "when": "shed_choice_grab",
  "content": { "en": "You grab the key before the stranger reacts." },
  "grants": [{ "flag": "has_key" }],
  "revokes": [{ "flag": "shed_choice_grab" }]
},
{
  "when": "shed_choice_talk",
  "content": { "en": "An interesting conversation — but the key is gone." },
  "grants": [{ "flag": "talked_to_stranger" }],
  "revokes": [{ "flag": "shed_choice_talk" }]
},
{
  "when": null,
  "content": { "en": "A rusty key hangs on the wall. A stranger steps in." },
  "choices": [
    {
      "id": "grab_key",
      "label": { "en": "Slip past them and take the key" },
      "grants": [{ "flag": "shed_choice_grab" }]
    },
    {
      "id": "talk",
      "label": { "en": "Stop and hear what they have to say" },
      "grants": [{ "flag": "shed_choice_talk" }]
    }
  ]
}
```

| Choice field | Required | Description |
|---|---|---|
| `id` | yes | Unique string within the choices array. |
| `label` | yes | Button text shown to the player. Multilingual. |
| `grants` | yes | Callback flags given when this choice is selected. Use `[]` if none. |

### Rules

- Callback values go **above** the choices value (more specific first).
- Callback values go **below** any values with more specific permanent-flag conditions (e.g. `has_key`).
- Each callback value includes `revokes` for its own callback flag — the close endpoint applies these.
- The `grants` on the callback value carry the real, permanent flags.
- A value with `choices` cannot also have a `password`.

---

## Passwords

Passwords use the same **callback flag** pattern as choices. A `password` field on a value entry shows a text input and a Confirm button. The correct code grants a callback flag, and a separate value entry above shows the success content.

### Step-by-step flow

1. Player enters location → auto-visit creates record with `status='open'` → sheet shows narrative + password input.
2. Player enters wrong code → "Wrong password. Keep exploring." message. Player can dismiss and retry later.
3. Player enters correct code → POST /visit with `password` → grants the callback flag.
4. Client refreshes → callback value matches → sheet shows success text.
5. Player presses "Done" → POST /close → applies callback value's grants (permanent flags) and revokes (removes callback flag), sets status to `closed`.

### JSON structure

```json
{
  "when": "toolbox_pw_correct",
  "content": {
    "en": "The lock clicks open. Inside you find a heavy hammer.",
    "it": "Il lucchetto scatta. Dentro trovi un pesante martello.",
    "es": "El candado se abre. Dentro encuentras un pesado martillo."
  },
  "grants": [{ "flag": "has_hammer" }],
  "revokes": [{ "flag": "toolbox_pw_correct" }]
},
{
  "when": null,
  "content": {
    "en": "A heavy toolbox sits here, locked with a combination.",
    "it": "Una pesante cassetta degli attrezzi è qui, chiusa con una combinazione.",
    "es": "Una pesada caja de herramientas está aquí, cerrada con combinación."
  },
  "password": {
    "value": "4729",
    "grants": [{ "flag": "toolbox_pw_correct" }]
  }
}
```

| Password field | Required | Description |
|---|---|---|
| `value` | yes | The correct answer. A string — can be digits, a word, anything. |
| `grants` | yes | Callback flags given on correct entry. |

### Rules

- Callback value goes **above** the password value (same ordering as choices).
- Callback value includes `revokes` for its own callback flag.
- The `grants` on the callback value carry the real, permanent flags.
- A value with `password` cannot also have `choices`.

### Chaining interactions

Because both passwords and choices use the callback flag pattern, they can be chained within the same location. For example: password → callback value with choices → choice callback values. Each step transitions through the value system while the location stays `open`.

> Put the code somewhere in the game world — on a notice board, in a clue at another location — so the player has to find it.

---

## Location visit status

Each location visit has a `status` field: `open` or `closed`.

| State | DB | Meaning |
|---|---|---|
| unvisited | No `LocationVisit` row | Never been here. Dark orange marker. |
| open | Row exists, `status='open'` | Player is interacting. Shows narrative/choices/password. |
| closed | Row exists, `status='closed'` | Interaction finished. Light orange marker. |

- First visit creates the row with `status='open'`.
- "Done" button calls POST /close → sets `status='closed'`, applies location-level grants, value-level grants/revokes.
- Re-visiting a closed location sets it back to `open`.
- `visited` (row exists) is permanent and drives marker colour. `status` drives interaction state.

---

## Chapter completion

Mark a value entry with `"completesChapter": true` to end the chapter. When that value is triggered, the session is closed, a completion banner appears, and the player can start the next chapter if one is linked.

```json
{
  "when": { "and": ["has_friend", { "or": ["has_key", "has_hammer"] }] },
  "content": {
    "en": "You and your friend force open the gate. Chapter 1 complete!"
  },
  "completesChapter": true
}
```

Only one value across the whole chapter should set `completesChapter: true`.

---

## Linking to a next chapter

Chapters are linked at import time, not in the JSON. When importing:

```bash
npx tsx scripts/adventure/import-game.ts \
  --file=scripts/adventure/chapter2.json \
  --slug=chapter-2 \
  --chapter=2 \
  --activate \
  --next-chapter-slug=chapter-3   # optional
```

Import the next chapter first, then import the current one referencing it via `--next-chapter-slug`.

---

## Map colours

| Colour | Meaning |
|---|---|
| Orange | Unvisited location or event |
| Light orange | Visited |
| Green | Location or event within range |

---

## Design tips

- **Start simple.** One flag per location, one condition per value. Complexity grows fast.
- **The order of `values` matters.** The engine picks the first match. Put the most specific conditions first, `null` last.
- **Every location needs a fallback.** Always end `values` with `"when": null`.
- **Flag names are free-form strings.** Use a consistent convention: `visited_x`, `has_x`, `talked_to_x`.
- **Omit what you don't need.** `grants`, `revokes`, `radiusM`, `imageUrl`, `type` are all optional. Only specify them when you need a non-default value.
- **Test with fake GPS.** The app has a built-in D-pad (enable via Settings → Fake GPS) for walking through a chapter on a desktop or indoors.
- **Re-import after every JSON change.** The database is not updated automatically. Run the import command and the app will reflect the changes immediately.

```bash
npx tsx scripts/adventure/import-game.ts \
  --file=scripts/adventure/0_tutorial.json \
  --slug=tutorial \
  --chapter=0 \
  --activate
```

---

## Full example

See `scripts/adventure/0_tutorial.json` for a complete working example covering all engine features: items, flag grants, flag revokes, choices with callback flags, password with callback flags, events, and chapter completion.
