// Curated directory of Valenza (AL) volunteer/civic associations.
//
// This file is the source of truth for the seeded entries. `prisma/seed.ts`
// upserts each row by `name` (unique), so re-seeding refreshes the data to match
// this list. Preferred contact follows website > facebook > instagram > email;
// the provided personal/generic email is used only as a fallback when no
// website/social was found. Fields left undefined were not reliably found and
// are intentionally NOT fabricated. Coordinates are approximate where a precise
// geocode was unavailable; entries without lat/lng still appear in the list.

export interface AssociationSeed {
  name: string
  description?: string
  website?: string
  facebook?: string
  instagram?: string
  email?: string
  phone?: string
  address?: string
  lat?: number
  lng?: number
}

export const ASSOCIATIONS_SEED: AssociationSeed[] = [
  {
    name: 'ACdV',
    description: 'Associazione Controllo del Vicinato',
    website: 'https://www.acdv.it',
    facebook: 'https://www.facebook.com/acdv.it',
    instagram: 'https://www.instagram.com/controllodelvicinato/',
    email: 'segreteria.organizzativa@acdv.it',
  },
  {
    name: 'AGESCI Valenza 1',
    website: 'https://gruppi.agesci.it/valenza1/',
    facebook: 'https://www.facebook.com/agescivalenza1/',
    email: 'valenza1@piemonte.agesci.it',
    phone: '+39 333 3379548',
    address: 'Strada al Po e Oltrepo 1, 15048 Valenza (AL)',
    lat: 45.0055,
    lng: 8.651,
  },
  {
    name: 'AGESCI Valenza 2',
    email: 'valenza2@piemonte.agesci.it',
    address: 'Viale Santuario (presso Santuario N.S. della Pietà), 15048 Valenza (AL)',
    lat: 45.0064,
    lng: 8.6331,
  },
  {
    name: 'A.I.D.O. Valenza',
    email: 'valenza@aido.it',
    phone: '+39 338 7296258',
    address: 'c/o AVIS, Viale Alessandro Manzoni 6, 15048 Valenza (AL)',
    lat: 44.999,
    lng: 8.6449,
  },
  // No contact channel or address could be verified.
  { name: 'A.i.M. - Rete di aiuto' },
  {
    name: "Amici del Museo dell'Arte Orafa",
    website: 'https://www.archiviorafivalenza.it/amicidelmuseo',
    facebook: 'https://www.facebook.com/AssociazioneAmiciMuseoValenza/',
    email: 'larry.ficalbi@gmail.com',
    address: 'Via Alfieri 13/H, 15048 Valenza (AL)',
    lat: 45.0106,
    lng: 8.6448,
  },
  {
    // Alessandria-based cultural association (runs the "I più fragili tra i più deboli" project).
    name: 'Amici ed ex Allievi del Liceo Scientifico Galileo Galilei',
    facebook: 'https://www.facebook.com/ipiufragilitraipiudeboli/',
  },
  {
    name: 'A.N.A. - Associazione Nazionale Alpini Valenza',
    website: 'https://alpinialessandria.it/',
    email: 'valenza.alessandria@ana.it',
    phone: '+39 0131 955259',
    address: 'Circonvallazione Ovest 45, 15048 Valenza (AL)',
    lat: 44.9987,
    lng: 8.636,
  },
  {
    name: 'AVIS Primo Soccorso Valenza',
    website: 'https://avisprimosoccorso.it/',
    facebook: 'https://www.facebook.com/AvisValenza/',
    instagram: 'https://www.instagram.com/avisvalenza/',
    email: 'info@avisprimosoccorso.it',
    phone: '+39 0131 924060',
    address: 'Viale Alessandro Manzoni 6, 15048 Valenza (AL)',
    lat: 44.999,
    lng: 8.6449,
  },
  // Only the provided personal email was available.
  { name: 'A.V.O.C.', email: 'secondo.maschio@tiscali.it' },
  {
    name: 'AVULSS Valenza',
    email: 'avulssvalenza@gmail.com',
    phone: '+39 0131 953403',
    address: 'Via Martiri di Cefalonia 13, 15048 Valenza (AL)',
    lat: 45.0089,
    lng: 8.6448,
  },
  {
    name: 'Centro Incontro Anziani',
    phone: '+39 0131 949290',
    email: 'anna.pizzo.1943@gmail.com',
    address: 'Via Sassi 73, 15048 Valenza (AL)',
    lat: 45.0128,
    lng: 8.6449,
  },
  {
    name: 'C.I.F. - Centro Italiano Femminile',
    email: 'enricaviolo@gmail.com',
    phone: '+39 348 9131259',
    address: 'Via Vittorio Amedeo 19 (c/o Duomo), 15048 Valenza (AL)',
    lat: 44.9986,
    lng: 8.6421,
  },
  {
    name: "Confraternita di San Bernardino e Sant'Eligio",
    website: 'http://www.sanbernardinovalenza.it/',
    email: 'loretoscinta@gmail.com',
    phone: '+39 338 1736775',
    address: 'Via Felice Cavallotti 70, 15048 Valenza (AL)',
    lat: 45.0158,
    lng: 8.6451,
  },
  {
    name: 'Confraternita di San Rocco e San Sebastiano',
    email: 'gastone.geoalp@gmail.com',
    phone: '+39 348 2516228',
    address: 'c/o Chiesa SS. Annunziata, Via Pastrengo 10, 15048 Valenza (AL)',
    lat: 45.0158,
    lng: 8.6477,
  },
  {
    name: "Confraternita della SS. Trinità",
    address: 'Via Cesare Cunietti 1, 15048 Valenza (AL)',
    lat: 45.0138,
    lng: 8.6438,
  },
  {
    name: 'Croce Rossa Italiana - Comitato di Valenza',
    facebook: 'https://www.facebook.com/crocerossavalenza/',
    email: 'crivalenza@crialessandria.it',
    phone: '+39 0131 951020',
    address: 'Strada Pontecurone 17, 15048 Valenza (AL)',
    lat: 44.9891,
    lng: 8.6512,
  },
  {
    name: 'Cuore di Zampa',
    facebook: 'https://www.facebook.com/cuoredizampavalenza/',
    instagram: 'https://www.instagram.com/cuoredizampavalenza/',
    email: 'cuoredizampavalenza@gmail.com',
    address: 'Viale Galimberti 2, 15048 Valenza (AL)',
    lat: 44.9995,
    lng: 8.6389,
  },
  // Local Valenza charity; no dedicated website/social/email could be verified.
  { name: 'FAI col Cuore' },
  // No dedicated contact channel could be verified.
  { name: 'Gli Amici di Mario' },
  {
    name: 'Insieme al Traguardo',
    email: 'patriziaraia63@gmail.com',
    address: 'c/o Oratorio del Duomo, 15048 Valenza (AL)',
    lat: 45.013,
    lng: 8.644,
  },
  {
    name: 'I Pensieri di Chadraque',
    website: 'https://www.pensieridichadraque.it/',
    facebook: 'https://www.facebook.com/ipensieridichadraque/',
    phone: '+39 339 5806910',
    address: 'Via Bologna 26, 15048 Valenza (AL)',
    lat: 44.9989,
    lng: 8.6449,
  },
  {
    name: 'LILT - Lega Italiana per la Lotta contro i Tumori (sezione Alessandria)',
    website: 'https://www.legatumori.al.it/',
    facebook: 'https://www.facebook.com/lilt.alessandria/',
    email: 'lilt.alcasale@gmail.com',
    address: 'Spalto Marengo 35, 15121 Alessandria (AL)',
    lat: 44.9053,
    lng: 8.6291,
  },
  {
    name: 'MiciAmici',
    website: 'https://www.miciamici.org/',
    facebook: 'https://www.facebook.com/MiciAmiciOdV/',
    email: 'miciamici@miciamici.org',
    phone: '+39 335 6936891',
  },
  {
    name: 'OFTAL - sezione Alessandria',
    website: 'https://www.oftal.org/alessandria/',
    phone: '+39 0131 441080',
    address: 'Via Plana 49, 15121 Alessandria (AL)',
  },
  {
    name: 'Organizzazione Europea Vigili del Fuoco Volontari di Protezione Civile di Valenza',
    email: 'protezionecivilevalenza@gmail.com',
    address: 'Vicolo Castello 5, 15048 Valenza (AL)',
    lat: 44.9982,
    lng: 8.6417,
  },
  {
    name: "Parrocchia di Sant'Agata di Villabella",
    website: 'http://www.diocesicasale.it/portfolio-articoli/parrocchia-di-s-agata-in-fraz-villabella-di-valenza/',
    email: 'pinofsalvatore@gmail.com',
    phone: '+39 0142 60351',
    address: 'Frazione Villabella, 15048 Valenza (AL)',
    lat: 45.0295,
    lng: 8.6122,
  },
  {
    name: 'Piccolo Principe',
    facebook: 'https://www.facebook.com/p/Piccoloprincipe-61551849021012/',
    email: 'piccoloprincipe.aps@gmail.com',
    phone: '+39 324 8667381',
    address: 'Via Noce 15, 15048 Valenza (AL)',
    lat: 44.9971,
    lng: 8.6438,
  },
  {
    name: 'Pro Loco Valenza',
    website: 'http://www.prolocovalenza.it/',
    email: 'prolocovalenza@libero.it',
    phone: '+39 0131 950131',
    address: 'Via San Giovanni 21, 15048 Valenza (AL)',
    lat: 44.9979,
    lng: 8.6428,
  },
  {
    name: "Projeto Corumba'",
    website: 'https://www.projetocorumba.org/',
    address: 'Via Verona 1, 15121 Alessandria (AL)',
  },
  {
    name: 'Raccolta Alimentare per gli Animali',
    facebook: 'https://www.facebook.com/groups/409612082455112/',
    email: 'lorygami.lp@libero.it',
  },
  {
    name: 'S.I.E. OdV - Solidarietà Internazionale ed Emergenza',
    website: 'http://www.sieonlus.org/',
    facebook: 'https://www.facebook.com/SIEONLUSAlessandria/',
    email: 'sie@sieonlus.org',
    phone: '+39 377 4586915',
    address: 'Bottega Solidale, Viale Vicenza 54, 15048 Valenza (AL)',
    lat: 45.0114,
    lng: 8.6389,
  },
  {
    // Valenza "Conferenza" — the local Facebook page is more specific than the
    // national federation site.
    name: 'Società di San Vincenzo de Paoli',
    facebook: 'https://www.facebook.com/sanvincenzovalenza/',
  },
  {
    name: 'Spezziamo il Pane con Padre Filippo',
    website: 'https://www.spezziamoilpaneconpadrefilippo.it/',
    facebook: 'https://www.facebook.com/p/Spezziamo-il-pane-con-Padre-Filippo-100071402437665/',
    email: 'spezziamoilpane@gmail.com',
    phone: '+39 348 8009504',
    address: 'Viale Manzoni 50, 15048 Valenza (AL)',
    lat: 45.0135,
    lng: 8.6407,
  },
  {
    name: 'UNITRE Valenza - Università delle Tre Età',
    website: 'https://www.unitrevalenza.com/',
    email: 'uni3valenza@gmail.com',
    phone: '+39 0131 972246',
    address: 'Via Carlo Camurati 39, 15048 Valenza (AL)',
    lat: 45.0102,
    lng: 8.6431,
  },
  // No association with this exact name could be verified.
  { name: 'Valenza Solidale' },
  {
    name: 'Vivere Insieme',
    facebook: 'https://www.facebook.com/assvivereinsiemevalenza/',
    email: 'assvivereinsiemevalenza@gmail.com',
    phone: '+39 0131 951261',
    address: 'Via Martiri di Cefalonia 13, 15048 Valenza (AL)',
    lat: 45.0089,
    lng: 8.6448,
  },
]
