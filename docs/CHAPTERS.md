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

`imageUrl` fields (on locations and items) accept either a full URL (`https://...`) or a relative R2 key (`game-art/foo.webp`). The import script resolves relative keys to full public URLs using `NEXT_PUBLIC_R2_PUBLIC_URL`. Store assets in R2 and reference them by key.

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
  "coordinates": { "lat": 45.01582, "lng": 8.62813 },
  "radiusM": 35,
  "imageUrl": null,
  "visibleWhen": null,
  "values": [ ... ],
  "grants": [],
  "revokes": []
}
```

| Field | Required | Default | Description |
|---|---|---|---|
| `id` | yes | — | Unique string within the chapter. Used internally to reference this location. |
| `type` | no | `"location"` | `"location"` or `"event"`. Controls app behaviour (see below). |
| `name` | yes | — | Name shown in the sheet and on the map. Multilingual object. |
| `coordinates` | yes | — | Real-world GPS coordinates of the centre of the interaction zone. |
| `radiusM` | no | 30 | Radius in metres. Player must be within this distance to interact. |
| `imageUrl` | no | `null` | Full URL or relative R2 key (e.g. `"game-art/foo.webp"`) of an image shown at the top of the sheet. Resolved at import time. Uses a default image if omitted. |
| `visibleWhen` | yes | — | Condition controlling when this location appears on the map (see Conditions). Use `null` for always visible. |
| `values` | yes | — | Array of narrative entries evaluated top-to-bottom (see Values). |
| `grants` | yes | — | Flags given to the player unconditionally when they visit. Use `[]` if none. |
| `revokes` | no | `[]` | Flags removed from the player when they visit (see Revokes). |
| `initialLocation` | no | `false` | Marks the intended starting point of the chapter. Only one location per chapter should have this. When Fake GPS mode is active, a **Start** button appears on the D-pad that teleports the player to 100 m south of this location — just outside the radius, ready to walk in. |

### type: "location" vs "event"

**location** (default)
- Shown on the map as an orange circle (unvisited) or grey (visited).
- When the player enters the radius, a green hint bar appears at the bottom of the screen.
- The player taps the hint bar (or the map marker) to open the information sheet.
- The player must act before they can dismiss the sheet (sheet is locked until they interact).

**event**
- Shown on the map as a red circle.
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
| `grants` | no | Flags given only when this specific value fires (conditional grants). Same format as location-level `grants`. |
| `revokes` | no | Flags removed only when this specific value fires (conditional revokes). Same format as location-level `revokes`. |

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

**grants** (on the location root) are applied unconditionally the first time the player visits.

```json
"grants": [{ "flag": "visited_start" }]
```

**revokes** removes flags from the player on visit. Both `grants` and `revokes` on the location root are unconditional — they fire regardless of which `values` entry matched.

For conditional grants/revokes that only apply when a specific value entry fires, define them inside the value object (see Value fields above). This is the right pattern for events where the effect depends on the player's state at the time of the visit.

Both are arrays. Use `[]` when nothing should be granted or revoked.

> Flags granted via `choices` or `password` are defined inside those objects, not here.

---

## Choices

When a value entry has `choices`, the player sees decision buttons instead of a simple Done button. They must pick one. The choice is final — they cannot go back.

```json
{
  "when": null,
  "content": {
    "en": "A rusty key hangs on the wall. A stranger enters before you can grab it."
  },
  "choices": [
    {
      "id": "grab_key",
      "label": { "en": "Slip past them and take the key" },
      "outcome": { "en": "You manage to grab the key before the stranger reacts." },
      "grants": [{ "flag": "has_key" }]
    },
    {
      "id": "talk",
      "label": { "en": "Stop and hear what they have to say" },
      "outcome": { "en": "When you turn back, the key is gone." },
      "grants": [{ "flag": "talked_to_stranger" }]
    }
  ]
}
```

| Choice field | Required | Description |
|---|---|---|
| `id` | yes | Unique string within the choices array. |
| `label` | yes | Button text shown to the player. Multilingual. |
| `outcome` | yes | Narrative shown after the player picks this option. Multilingual. |
| `grants` | yes | Flags given when this choice is selected. Use `[]` if none. |

A location with choices **must not** also have a `password` on the same value entry.

---

## Passwords

A `password` field on a value entry locks the location behind a code. The player sees a text input and a Confirm button. The correct code grants the associated flags.

```json
{
  "when": null,
  "content": {
    "en": "A heavy toolbox sits here, locked with a combination."
  },
  "password": {
    "value": "4729",
    "successContent": {
      "en": "The lock clicks open. Inside you find a heavy hammer.",
      "it": "Il lucchetto scatta. Dentro trovi un pesante martello.",
      "es": "El candado se abre. Dentro encuentras un pesado martillo."
    },
    "grants": [{ "flag": "has_hammer" }]
  }
}
```

| Password field | Required | Description |
|---|---|---|
| `value` | yes | The correct answer. A string — can be digits, a word, anything. |
| `successContent` | yes | Narrative shown on correct entry. Multilingual. |
| `grants` | yes | Flags given on correct entry. |

**Wrong password behaviour:** the sheet shows "Wrong password. Keep exploring." and a Done button. The location is marked visited but the player can tap the map marker to try again as many times as needed. Once the correct code is entered and the flag is granted, the location switches to its "already collected" narrative and the password input disappears.

> Put the code somewhere in the game world — on a notice board, in a clue at another location — so the player has to find it.

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
- **Test with fake GPS.** The app has a built-in D-pad (enable via Settings → Fake GPS) for walking through a chapter on a desktop or indoors.
- **Re-import after every JSON change.** The database is not updated automatically. Run the import command and the app will reflect the changes immediately.

```bash
npx tsx scripts/adventure/import-game.ts \
  --file=scripts/adventure/chapter1.json \
  --slug=chapter-1 \
  --chapter=1 \
  --activate
```

---

## Full example — chapter1.json

See `scripts/adventure/chapter1.json` for a complete working example covering all engine features: items, flag grants, flag revokes, choices, password, events, and chapter completion.
