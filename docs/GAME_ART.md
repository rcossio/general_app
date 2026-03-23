# Prompts

## Image Generation

Prompt example to have consistent style:

---

Make me an image.
**Format:** 3:2 horizontal

**Content:** a dog getting out of the house that started to chase me

**POV:** yes, first-person point of view

**Feeling:** situational surprise, urgency, and slight fear; the dog is intense and sudden, but not vicious, rabid, or openly aggressive

**Style:**
A cinematic 3:2 horizontal illustration in a semi-realistic hand-drawn storybook style with controlled linework and clean painterly rendering. The image uses confident ink-like contours, clear sketch structure, readable shapes, and disciplined edge control. Rendering is matte and graphic rather than watery, with solid form modeling, soft controlled shading, and broad clean value masses. Surface treatment is restrained and polished, with minimal paper grain, minimal brush noise, and no loose watercolor diffusion. The image feels handcrafted and illustrative, but the finish is stable, deliberate, and visually clean.

The palette is muted, natural, and slightly enriched, built from soft stone gray, weathered wood brown, faded olive, dusty blue, muted slate, off-white, and restrained earth neutrals. Color remains balanced and controlled, avoiding sepia dominance, golden overcast warmth, and oversaturated fantasy hues.

Lighting is soft and directional, creating depth and mood while keeping forms clear and readable. Contrast is moderate, with selective highlights and clean separation between subject and environment.

The drawing emphasizes strong silhouette design, expressive form, and narrative clarity. Background elements are simplified and atmospheric, but not blurry or washed out. The main subject and key environmental forms are rendered with the highest clarity.

The overall image feels like a high-end illustrated film still or premium graphic novel panel: cinematic, grounded, emotionally readable, rustic, and dramatic, with clean draftsmanship and restrained painterly texture.

**Rendering constraints:** clean edges, controlled brush texture, low surface noise, low grain, low pigment spread, no watercolor bloom, no ink bleed, no splatter, no messy wash texture, no heavy paper texture, no abstract brush buildup, no impressionistic smearing.

---

## Convert, upload and refresh

```bash
cwebp -q 80 -resize 600 400 input.png -o output_600x400.webp

npx tsx scripts/adventure/import-game.ts --file=scripts/adventure/chapter1.json --slug=chapter-1 --chapter=1 --activate 2>&1
```
