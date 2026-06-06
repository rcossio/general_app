# Vysi — Brand Guide

## Identidad

- **Nombre:** Vysi
- **Dominio:** vysi.one (suena como "visione")
- **Tagline:** "Valenza, quello che non avevi notato."
  - Escala a otras ciudades: "[Ciudad], quello che non avevi notato."
  - El separador es coma, no dos puntos. La coma da tono conversacional, los dos puntos suenan editorial.
- **Qué es:** Plataforma de experiencias urbanas. Empieza con aventuras narrativas geolocalizadas en Valenza Po (Piemonte). En el futuro puede incluir visitas autoguiadas, otras experiencias, y expandirse a otras ciudades italianas.

## Personalidad y tono de voz

Vysi es un amigo entusiasta y positivo. Te muestra belleza donde no la habías notado. Está emocionado de mostrarte. Cálido, curioso, contagioso.

- **Tono:** Cercano y energético pero no infantil. Habla como un local que conoce los secretos del barrio.
- **Idioma principal:** Italiano. Inglés natural para turistas.
- **Lo que NO es:** No es un juego para nenes. No es una app de turismo aburrida. No debe parecerse a Duolingo.

## Público objetivo

1. Jóvenes 18-35 en Valenza y ciudades cercanas (lanzamiento)
2. Familias con chicos 8-12 años (segunda fase)
3. Turistas (tercera fase)

## Paleta de colores

Los colores nacen de la naturaleza real de Valenza: el verde del pasto en los campi en primavera, y el rojo coral de las hojas jóvenes de Photinia Red Robin que cubren las siepes de la ciudad.

### Light Mode

| Token | Hex | Uso |
|---|---|---|
| `--green` | `#48b35c` | Color primario. Logo, navegación, badges, banners. |
| `--photinia` | `#e0655a` | Color acento. CTAs, highlights, nombres de personajes en narrativa. |
| `--white` | `#ffffff` | Fondo de cards y superficies. |
| `--bg` | `#f7f7f5` | Fondo general de la app. |
| `--black` | `#1a1a1a` | Texto principal. |
| `--text` | `#2a2a2a` | Texto narrativo (levemente más suave que black). |
| `--gray` | `#888888` | Texto secundario, metadata. |
| `--green-light` | `#edf8ef` | Fondo de cards/chips verdes. |
| `--photinia-light` | `#fdeeed` | Fondo de cards/chips Photinia. |
| `--border` | `#ebebeb` | Bordes y separadores. |

### Dark Mode

| Token | Hex Light → Dark | Nota |
|---|---|---|
| `--green` | `#48b35c` → `#5cc96e` | Sube luminosidad para contraste sobre fondo oscuro. |
| `--photinia` | `#e0655a` → `#e06a60` | Se mantiene casi igual (ya es clara). |
| `--bg` | `#f7f7f5` → `#121212` | Negro suave, no puro. |
| `--white` (surfaces) | `#ffffff` → `#1a1a1a` | Cards y header. |
| `--black` (text) | `#1a1a1a` → `#e0e0e0` | Texto principal invertido. |
| `--text` | `#2a2a2a` → `#bbbbbb` | Texto narrativo. |
| `--gray` | `#888888` → `#777777` | Texto secundario. |
| `--green-light` | `#edf8ef` → `#1e3222` | Fondo verde oscuro saturado. |
| `--photinia-light` | `#fdeeed` → `#3a2020` | Fondo Photinia oscuro saturado. |
| `--border` | `#ebebeb` → `#2a2a2a` | Bordes sutiles. |

### Restricciones de color

- **El verde `#48b35c` no debe cambiar en light mode.** Es el color de marca primario, derivado del pasto real de Valenza (mezcla 50% entre verde natural de foto y verde digital). Se eligió específicamente para no ser el verde iOS (#34c759).
- **El Photinia `#e0655a` no debe cambiar en light mode.** Es una estilización de los colores reales extraídos de una foto de Photinia Red Robin en Valenza. Se eligió como variante "coral saturada" — no más oscura que esto.
- **El fondo dark mode debe ser `#121212`, no negro puro `#000000`.** Negro puro es agresivo para lectura prolongada.

## Tipografía

Todas las fuentes son gratuitas (Google Fonts) con soporte completo de caracteres latinos (IT/EN/ES: àèìòù áéíóú).

### Fuentes

| Fuente | Uso | Pesos |
|---|---|---|
| **Rubik** | Logo "vysi", títulos de aventura, headers de sección, botones, tags, badges, navegación | 700, 800, 900 |
| **Plus Jakarta Sans** | Texto narrativo (body), metadata, descripciones, contenido largo | 400, 500, 600, 700 |

### Jerarquía tipográfica

| Elemento | Fuente | Peso | Tamaño |
|---|---|---|---|
| Logo "vysi" | Rubik | 800 | 26px |
| Título de aventura | Rubik | 700 | 16-17px |
| Header de sección | Rubik | 700 | 16px |
| Banner título | Rubik | 700 | 15px |
| Botón CTA | Rubik | 700 | 13px |
| Tag / Badge | Rubik | 700 | 10px |
| Navegación | Rubik | 600 | 10px |
| Texto narrativo | Plus Jakarta Sans | 400 | 14-15px |
| Bionic bold (palabras clave) | Plus Jakarta Sans | 600 | mismo que body |
| Nombre de personaje | Plus Jakarta Sans | 700 | mismo que body |
| Metadata / subtexto | Plus Jakarta Sans | 500 | 11px |

### Restricciones tipográficas

- **Rubik reemplaza a Sora como fuente de títulos y logo.** Sora se descartó porque la V era visualmente pobre. Rubik tiene esquinas suavemente redondeadas que combinan con la personalidad friendly de Vysi sin ser infantil.
- **Plus Jakarta Sans es la fuente de lectura y no debe reemplazarse por Rubik en body text.** Jakarta tiene letras más abiertas y proporciones más relajadas, lo cual es mejor para lectura sostenida en narrativa.
- **No usar Nunito (infantil/Duolingo), Quicksand (muy fina), ni Sora (V fea) como alternativas.**

## Lectura accesible (Bionic Reading)

La app tiene mucho texto narrativo. Para mejorar la legibilidad, especialmente para personas con TDAH:

- **Palabras clave** van en Plus Jakarta Sans 600 (semibold) sobre texto regular 400.
- **Nombres de personajes** van en color Photinia + weight 700.
- **Nombres de lugares** van en verde oscuro (`--green-dark: #3a9148`) + weight 600.

Esto crea tres niveles de jerarquía visual sin romper el flujo de lectura.

## Logo

### Ícono

El ícono es una **V de Rubik (weight 900)** cuya punta apoya en el centro de un **diamante en perspectiva** (plano/mapa) color Photinia. El fondo es verde Vysi con esquinas redondeadas (rx: 44 para 200px, proporcional en otros tamaños).

- **Concepto:** La V es un marcador que señala un punto en el mapa. La V es Vysi, el diamante es la ciudad.
- **Variante elegida:** Plano ancho (el diamante cubre casi todo el ancho del ícono).
- **Colores del ícono:** Fondo verde `#48b35c`, V blanca `#ffffff`, diamante Photinia `#e0655a`.
- **Archivo SVG:** `vysi-logo-font.svg` (usa Google Fonts import para Rubik). Para uso offline, trazar la V como path en Figma.

### Logo lockup

Ícono + texto "vysi" en Rubik 800 color `#48b35c`, alineados horizontalmente con 12px de gap.

### Restricciones del logo

- **La V debe ser Rubik weight 900, no otra fuente.** Se probaron Jakarta, Outfit, Sora, Poppins, Manrope. Rubik fue la elegida por solidez y esquinas suaves.
- **El plano debe ser Photinia sólido, no outline ni semitransparente.** Se probaron todas las variantes.
- **El plano debe ser la variante "ancha" que cubre casi todo el ancho del ícono.**
- **La V apoya su punta en el centro del diamante. No se entierra ni flota.**

## Landing page — dirección de contenido y diseño

### Principio: la historia primero, el producto después

La landing NO es una página de producto. Es el primer contacto con el misterio. El visitante debe sentir curiosidad antes de entender qué es Vysi. El flujo es: **gancho narrativo → emoción → explicación → prueba → acción**.

### Estructura de secciones

1. **Hero (banner verde con gradiente):** Gancho narrativo con tensión. "Una bottega in fiamme. Un apprendista scomparso. La verità è nascosta nelle vie di Valenza." La palabra clave dramática ("La verità") va en color Photinia. El fondo es un gradiente oscuro-a-claro del verde Vysi (`from-[#2d7a3e] via-brand-green to-[#3a9148]`) con textura sutil de cruces. Badge visible: "Gratuita · 45 min · Dal tuo telefono". CTA: "Inizia l'indagine" (no genérico "Gioca ora").

2. **Cómo se siente (no "cómo funciona"):** Tres cards con experiencia, no mecánica. "Ricevi un messaggio misterioso" / "Segui gli indizi per le vie della città" / "Risolvi l'enigma prima che la storia finisca". La tercera card usa fondo Photinia-light para tensión visual.

3. **Preview del juego (sección nueva):** Un mock card que simula un momento real de la aventura. Incluye: badge de capítulo, nombre de locación, texto narrativo con bionic reading (palabras clave en semibold, nombres de personajes en Photinia bold, nombres de lugares en verde oscuro semibold), hint de locación con MapPin, y un campo de input simulado. Esto muestra la calidad narrativa y la mecánica GPS sin explicarla abstractamente.

4. **CTA final (banner Photinia):** "Il mistero ti aspetta" con subline "Gratuita, dal tuo telefono, in 45 minuti."

### Restricciones de la landing

- **El hero DEBE liderar con la historia, no con la descripción del producto.** "Un gioco di avventura GPS" es un subtexto, no el título.
- **No usar lenguaje de app store.** Nada de "descarga", "instala", "la mejor app de". Vysi es una experiencia, no un producto.
- **La palabra "Photinia" nunca aparece en la UI.** Es un nombre interno del color. En la landing se usa como acento dramático, no como etiqueta.
- **El tagline oficial "Valenza, quello che non avevi notato." aparece como subtexto del hero, no como título principal.** El título principal es el gancho narrativo.
- **Todos los textos de la landing existen en 3 idiomas** (IT/EN/ES) en `locales/*.ts` bajo el namespace `landing.*`.

### Color en la landing

- **Verde dominante:** El navbar y el hero son verde Vysi. Esto establece la identidad de marca inmediatamente.
- **Photinia como acento dramático:** Se usa para la palabra clave en el hero, el botón CTA, la tercera card de "cómo se siente", los badges de capítulo, y el banner final.
- **Verde oscuro (`--green-dark`) en texto narrativo:** Para nombres de lugares en el preview del juego, siguiendo la misma convención que el juego real.
- **Blanco/superficie para contenido:** Las secciones de contenido (cards, preview) usan fondo blanco o `--bg` para contraste contra las secciones verdes/Photinia.

## Modelo de negocio

- Aventuras gratuitas con propina a creadores (Vysi toma comisión: ~5% o monto fijo ~€0.50)
- Sponsors locales (bares, locales) integrados en la narrativa — desbloquean arcos narrativos o adelantan historia
- Aventuras VIP de pago (por aventura individual o suscripción)
- Escala geográfica a otras ciudades italianas (no eventos privados — cada aventura requiere trabajo narrativo serio)

## Estrategia de lanzamiento

- **Formato:** Eventos exclusivos de fin de semana ("Vysi apre questo weekend"). Genera urgencia y permite iterar si hay errores.
- **Presencia física:** Estar al final del recorrido para premiar a quienes completen la aventura. Genera boca a boca.
- **Canales:** Instagram, Facebook, grupos de WhatsApp locales.
