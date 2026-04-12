'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'
import { useChrome } from '@/contexts/ChromeContext'
import { useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const LOCALE_LABELS: Record<string, string> = { en: 'EN', it: 'IT', es: 'ES' }
const LOCALES = ['it', 'en', 'es'] as const
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'you@example.com'

const content: Record<string, { title: string; lastUpdated: string; sections: { heading: string; body: string }[] }> = {
  it: {
    title: 'Informativa sulla Privacy',
    lastUpdated: 'Ultimo aggiornamento: 5 aprile 2026',
    sections: [
      {
        heading: '1. Titolare del trattamento',
        body: 'Il titolare del trattamento dei dati è l\'operatore di Vysi (vysi.one). Per qualsiasi domanda relativa alla privacy, contattaci a: ${CONTACT_EMAIL}.',
      },
      {
        heading: '2. Dati raccolti',
        body: 'Raccogliamo i seguenti dati personali:\n• **Email e nome**: forniti durante la registrazione, utilizzati per identificare il tuo account.\n• **Posizione GPS**: utilizzata durante il gioco per verificare la tua prossimità ai luoghi. Non viene salvata sui nostri server — viene inviata solo al momento della visita di un luogo e non viene conservata.\n• **Voci del tracker**: titolo, contenuto, punteggio e tag inseriti volontariamente. Puoi scegliere di renderle pubbliche o private.\n• **Foto profilo**: se carichi un avatar, viene archiviato su Cloudflare R2.\n• **Dati dell\'account Google**: se accedi con Google, riceviamo il tuo nome, email e foto profilo da Google. Non riceviamo la tua password Google.',
      },
      {
        heading: '3. Finalità del trattamento',
        body: '• Gestione dell\'account e autenticazione\n• Funzionamento del gioco di avventura basato su GPS\n• Funzionalità community (feed pubblico del tracker)\n• Miglioramento dell\'app',
      },
      {
        heading: '4. Base giuridica',
        body: '• **Consenso**: accettato al momento della registrazione per il trattamento dei dati.\n• **Esecuzione del contratto**: necessario per fornirti il servizio (gioco, tracker, account).\n• **Interesse legittimo**: sicurezza dell\'app e prevenzione abusi.',
      },
      {
        heading: '5. Condivisione dei dati',
        body: 'Non vendiamo i tuoi dati. Condividiamo dati solo con:\n• **Google** (se usi Google OAuth — solo per l\'autenticazione)\n• **Cloudflare R2** (archiviazione immagini profilo e contenuti di gioco)\n• **Hetzner** (hosting del server in Germania, UE)\n\nTutti i fornitori operano all\'interno dell\'UE o sono conformi al GDPR.',
      },
      {
        heading: '6. Conservazione dei dati',
        body: 'I dati dell\'account vengono conservati per tutta la durata dell\'account. Se richiedi la cancellazione, l\'account viene disattivato immediatamente e i dati personali vengono eliminati definitivamente dopo 30 giorni.',
      },
      {
        heading: '7. I tuoi diritti',
        body: 'Ai sensi del GDPR, hai il diritto di:\n• **Accesso**: visualizzare i tuoi dati personali (pagina Profilo)\n• **Rettifica**: modificare il tuo nome e avatar (pagina Profilo)\n• **Cancellazione**: eliminare il tuo account e tutti i dati associati (pagina Profilo)\n• **Portabilità**: richiedere una copia dei tuoi dati\n• **Opposizione**: opporti al trattamento dei tuoi dati\n\nPer esercitare i tuoi diritti, contattaci a ${CONTACT_EMAIL}.',
      },
      {
        heading: '8. Cookie',
        body: 'Utilizziamo un solo cookie tecnico strettamente necessario:\n• **refresh_token**: cookie httpOnly per mantenere la tua sessione di accesso. Non traccia la tua attività.\n\nNon utilizziamo cookie di analytics, di profilazione o pubblicitari. Non è necessario un banner cookie.',
      },
      {
        heading: '9. Sicurezza',
        body: 'Le password sono hashate con bcrypt. I token di accesso scadono dopo 15 minuti. I token di aggiornamento sono ruotati e revocabili. Tutte le comunicazioni avvengono tramite HTTPS.',
      },
      {
        heading: '10. Modifiche',
        body: 'Potremmo aggiornare questa informativa. La data dell\'ultimo aggiornamento è indicata in alto. L\'uso continuativo del servizio costituisce accettazione delle modifiche.',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: April 5, 2026',
    sections: [
      {
        heading: '1. Data controller',
        body: 'The data controller is the operator of Vysi (vysi.one). For any privacy-related questions, contact us at: ${CONTACT_EMAIL}.',
      },
      {
        heading: '2. Data we collect',
        body: 'We collect the following personal data:\n• **Email and name**: provided during registration, used to identify your account.\n• **GPS location**: used during gameplay to verify your proximity to locations. It is not stored on our servers — it is sent only at the moment of visiting a location and is not retained.\n• **Tracker entries**: title, content, score, and tags you enter voluntarily. You choose whether to make them public or private.\n• **Profile photo**: if you upload an avatar, it is stored on Cloudflare R2.\n• **Google account data**: if you sign in with Google, we receive your name, email, and profile picture from Google. We do not receive your Google password.',
      },
      {
        heading: '3. Purpose of processing',
        body: '• Account management and authentication\n• GPS-based adventure game operation\n• Community features (public tracker feed)\n• App improvement',
      },
      {
        heading: '4. Legal basis',
        body: '• **Consent**: accepted at registration for data processing.\n• **Contract performance**: necessary to provide you the service (game, tracker, account).\n• **Legitimate interest**: app security and abuse prevention.',
      },
      {
        heading: '5. Data sharing',
        body: 'We do not sell your data. We share data only with:\n• **Google** (if you use Google OAuth — authentication only)\n• **Cloudflare R2** (profile image and game content storage)\n• **Hetzner** (server hosting in Germany, EU)\n\nAll providers operate within the EU or are GDPR-compliant.',
      },
      {
        heading: '6. Data retention',
        body: 'Account data is retained for the lifetime of the account. If you request deletion, your account is deactivated immediately and personal data is permanently deleted after 30 days.',
      },
      {
        heading: '7. Your rights',
        body: 'Under GDPR, you have the right to:\n• **Access**: view your personal data (Profile page)\n• **Rectification**: edit your name and avatar (Profile page)\n• **Erasure**: delete your account and all associated data (Profile page)\n• **Portability**: request a copy of your data\n• **Objection**: object to processing of your data\n\nTo exercise your rights, contact us at ${CONTACT_EMAIL}.',
      },
      {
        heading: '8. Cookies',
        body: 'We use a single strictly necessary technical cookie:\n• **refresh_token**: httpOnly cookie to maintain your login session. It does not track your activity.\n\nWe do not use analytics, profiling, or advertising cookies. No cookie banner is required.',
      },
      {
        heading: '9. Security',
        body: 'Passwords are hashed with bcrypt. Access tokens expire after 15 minutes. Refresh tokens are rotated and revocable. All communication is over HTTPS.',
      },
      {
        heading: '10. Changes',
        body: 'We may update this policy. The last updated date is shown at the top. Continued use of the service constitutes acceptance of changes.',
      },
    ],
  },
  es: {
    title: 'Política de Privacidad',
    lastUpdated: 'Última actualización: 5 de abril de 2026',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        body: 'El responsable del tratamiento de datos es el operador de Vysi (vysi.one). Para cualquier consulta sobre privacidad, contáctanos en: ${CONTACT_EMAIL}.',
      },
      {
        heading: '2. Datos que recopilamos',
        body: 'Recopilamos los siguientes datos personales:\n• **Correo electrónico y nombre**: proporcionados durante el registro, utilizados para identificar tu cuenta.\n• **Ubicación GPS**: utilizada durante el juego para verificar tu proximidad a los lugares. No se almacena en nuestros servidores — se envía solo en el momento de visitar un lugar y no se conserva.\n• **Entradas del tracker**: título, contenido, puntuación y etiquetas que introduces voluntariamente. Tú eliges si hacerlas públicas o privadas.\n• **Foto de perfil**: si subes un avatar, se almacena en Cloudflare R2.\n• **Datos de cuenta Google**: si inicias sesión con Google, recibimos tu nombre, correo y foto de perfil de Google. No recibimos tu contraseña de Google.',
      },
      {
        heading: '3. Finalidad del tratamiento',
        body: '• Gestión de cuenta y autenticación\n• Funcionamiento del juego de aventura basado en GPS\n• Funciones comunitarias (feed público del tracker)\n• Mejora de la app',
      },
      {
        heading: '4. Base legal',
        body: '• **Consentimiento**: aceptado en el registro para el tratamiento de datos.\n• **Ejecución del contrato**: necesario para proporcionarte el servicio (juego, tracker, cuenta).\n• **Interés legítimo**: seguridad de la app y prevención de abusos.',
      },
      {
        heading: '5. Compartición de datos',
        body: 'No vendemos tus datos. Compartimos datos solo con:\n• **Google** (si usas Google OAuth — solo para autenticación)\n• **Cloudflare R2** (almacenamiento de imágenes de perfil y contenido del juego)\n• **Hetzner** (alojamiento del servidor en Alemania, UE)\n\nTodos los proveedores operan dentro de la UE o cumplen con el GDPR.',
      },
      {
        heading: '6. Conservación de datos',
        body: 'Los datos de la cuenta se conservan mientras la cuenta esté activa. Si solicitas la eliminación, tu cuenta se desactiva inmediatamente y los datos personales se eliminan permanentemente después de 30 días.',
      },
      {
        heading: '7. Tus derechos',
        body: 'Bajo el GDPR, tienes derecho a:\n• **Acceso**: ver tus datos personales (página de Perfil)\n• **Rectificación**: editar tu nombre y avatar (página de Perfil)\n• **Supresión**: eliminar tu cuenta y todos los datos asociados (página de Perfil)\n• **Portabilidad**: solicitar una copia de tus datos\n• **Oposición**: oponerte al tratamiento de tus datos\n\nPara ejercer tus derechos, contáctanos en ${CONTACT_EMAIL}.',
      },
      {
        heading: '8. Cookies',
        body: 'Utilizamos una sola cookie técnica estrictamente necesaria:\n• **refresh_token**: cookie httpOnly para mantener tu sesión iniciada. No rastrea tu actividad.\n\nNo utilizamos cookies de analítica, de perfilado o publicitarias. No se requiere banner de cookies.',
      },
      {
        heading: '9. Seguridad',
        body: 'Las contraseñas se hashean con bcrypt. Los tokens de acceso expiran a los 15 minutos. Los tokens de actualización se rotan y son revocables. Toda la comunicación es por HTTPS.',
      },
      {
        heading: '10. Cambios',
        body: 'Podemos actualizar esta política. La fecha de última actualización se muestra arriba. El uso continuado del servicio constituye la aceptación de los cambios.',
      },
    ],
  },
}

function renderMarkdownLite(text: string) {
  // Replace email placeholder and render formatting
  const resolved = text.replace(/\$\{CONTACT_EMAIL\}/g, CONTACT_EMAIL)
  return resolved.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g)
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    )
    if (line.startsWith('• ')) {
      return <li key={i} className="ml-4 list-disc">{rendered}</li>
    }
    return <p key={i} className={i > 0 ? 'mt-1' : ''}>{rendered}</p>
  })
}

export default function PrivacyPage() {
  const { locale, setLocale } = useLocale()
  const { setHideChrome } = useChrome()
  const [langOpen, setLangOpen] = useState(false)

  useEffect(() => {
    setHideChrome(true)
    return () => setHideChrome(false)
  }, [setHideChrome])

  const c = content[locale] ?? content.it

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="font-bold text-lg text-blue-600">Vysi</Link>
        <div className="relative">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Globe className="h-4 w-4" />
            {LOCALE_LABELS[locale]}
            <ChevronDown className="h-3 w-3" />
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-1 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[80px]">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLocale(l); setLangOpen(false) }}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${locale === l ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-2xl font-bold mb-2">{c.title}</h1>
        <p className="text-sm text-gray-400 mb-8">{c.lastUpdated}</p>
        <div className="space-y-6">
          {c.sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-semibold text-base mb-2">{s.heading}</h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                {renderMarkdownLite(s.body)}
              </div>
            </section>
          ))}
        </div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <Link href="/" className="hover:text-blue-600">Vysi</Link> · <Link href="/privacy" className="hover:text-blue-600">{c.title}</Link> · <Link href="/terms" className="hover:text-blue-600">{locale === 'it' ? 'Termini di Servizio' : locale === 'es' ? 'Términos de Servicio' : 'Terms of Service'}</Link>
      </footer>
    </div>
  )
}
