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
    title: 'Termini di Servizio',
    lastUpdated: 'Ultimo aggiornamento: 5 aprile 2026',
    sections: [
      {
        heading: '1. Accettazione dei termini',
        body: 'Utilizzando Vysi (il "Servizio"), accetti questi Termini di Servizio. Se non li accetti, non utilizzare il Servizio. Registrandoti, confermi di avere almeno 16 anni.',
      },
      {
        heading: '2. Descrizione del servizio',
        body: 'Vysi è una piattaforma che include un gioco di avventura basato su GPS e un tracker personale. Il Servizio è fornito "così com\'è" e può essere modificato o interrotto in qualsiasi momento.',
      },
      {
        heading: '3. Account utente',
        body: '• Sei responsabile della sicurezza del tuo account e della tua password.\n• Non puoi condividere le credenziali del tuo account con altri.\n• Devi fornire informazioni accurate durante la registrazione.\n• Ci riserviamo il diritto di sospendere o eliminare account che violano questi termini.',
      },
      {
        heading: '4. Uso accettabile',
        body: 'Non puoi:\n• Utilizzare il Servizio per attività illegali\n• Tentare di accedere ad account o dati di altri utenti\n• Interferire con il funzionamento del Servizio\n• Utilizzare bot o strumenti automatizzati per accedere al Servizio\n• Pubblicare contenuti offensivi, diffamatori o inappropriati nel feed pubblico',
      },
      {
        heading: '5. Contenuti dell\'utente',
        body: 'I contenuti che crei (voci del tracker, dati di profilo) rimangono di tua proprietà. Concedi a Vysi una licenza limitata per archiviare e visualizzare i tuoi contenuti pubblici nel feed della community. I contenuti privati sono visibili solo a te.',
      },
      {
        heading: '6. Proprietà intellettuale',
        body: 'I contenuti del gioco (storie, personaggi, immagini, enigmi) sono proprietà di Vysi e sono protetti dal diritto d\'autore. Non puoi copiare, distribuire o riprodurre i contenuti del gioco senza autorizzazione.',
      },
      {
        heading: '7. Dati sulla posizione',
        body: 'Il gioco di avventura richiede l\'accesso al GPS. I dati sulla posizione vengono utilizzati esclusivamente per verificare la prossimità ai luoghi di gioco e non vengono memorizzati sui nostri server. Puoi revocare l\'accesso al GPS in qualsiasi momento dalle impostazioni del dispositivo.',
      },
      {
        heading: '8. Cancellazione dell\'account',
        body: 'Puoi eliminare il tuo account in qualsiasi momento dalla pagina Profilo. L\'account verrà disattivato immediatamente e i dati personali eliminati definitivamente dopo 30 giorni.',
      },
      {
        heading: '9. Limitazione di responsabilità',
        body: 'Il Servizio è fornito "così com\'è", senza garanzie di alcun tipo. Vysi non è responsabile per:\n• Interruzioni o errori del Servizio\n• Perdita di dati\n• Danni derivanti dall\'uso del Servizio\n• Lesioni durante il gioco — presta sempre attenzione all\'ambiente circostante quando giochi in movimento',
      },
      {
        heading: '10. Modifiche ai termini',
        body: 'Potremmo aggiornare questi termini. La data dell\'ultimo aggiornamento è indicata in alto. L\'uso continuativo del Servizio dopo le modifiche costituisce accettazione dei nuovi termini.',
      },
      {
        heading: '11. Contatti',
        body: 'Per domande su questi termini, contattaci a: ${CONTACT_EMAIL}.',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: April 5, 2026',
    sections: [
      {
        heading: '1. Acceptance of terms',
        body: 'By using Vysi (the "Service"), you agree to these Terms of Service. If you do not agree, do not use the Service. By registering, you confirm you are at least 16 years old.',
      },
      {
        heading: '2. Description of service',
        body: 'Vysi is a platform that includes a GPS-based adventure game and a personal life tracker. The Service is provided "as is" and may be modified or discontinued at any time.',
      },
      {
        heading: '3. User accounts',
        body: '• You are responsible for the security of your account and password.\n• You may not share your account credentials with others.\n• You must provide accurate information during registration.\n• We reserve the right to suspend or delete accounts that violate these terms.',
      },
      {
        heading: '4. Acceptable use',
        body: 'You may not:\n• Use the Service for illegal activities\n• Attempt to access other users\' accounts or data\n• Interfere with the operation of the Service\n• Use bots or automated tools to access the Service\n• Post offensive, defamatory, or inappropriate content in the public feed',
      },
      {
        heading: '5. User content',
        body: 'Content you create (tracker entries, profile data) remains your property. You grant Vysi a limited license to store and display your public content in the community feed. Private content is visible only to you.',
      },
      {
        heading: '6. Intellectual property',
        body: 'Game content (stories, characters, images, puzzles) is the property of Vysi and is protected by copyright. You may not copy, distribute, or reproduce game content without permission.',
      },
      {
        heading: '7. Location data',
        body: 'The adventure game requires GPS access. Location data is used solely to verify your proximity to game locations and is not stored on our servers. You can revoke GPS access at any time from your device settings.',
      },
      {
        heading: '8. Account deletion',
        body: 'You may delete your account at any time from the Profile page. Your account will be deactivated immediately and personal data permanently deleted after 30 days.',
      },
      {
        heading: '9. Limitation of liability',
        body: 'The Service is provided "as is", without warranties of any kind. Vysi is not liable for:\n• Service interruptions or errors\n• Data loss\n• Damages arising from use of the Service\n• Injuries during gameplay — always pay attention to your surroundings when playing on the move',
      },
      {
        heading: '10. Changes to terms',
        body: 'We may update these terms. The last updated date is shown at the top. Continued use of the Service after changes constitutes acceptance of the new terms.',
      },
      {
        heading: '11. Contact',
        body: 'For questions about these terms, contact us at: ${CONTACT_EMAIL}.',
      },
    ],
  },
  es: {
    title: 'Términos de Servicio',
    lastUpdated: 'Última actualización: 5 de abril de 2026',
    sections: [
      {
        heading: '1. Aceptación de los términos',
        body: 'Al usar Vysi (el "Servicio"), aceptas estos Términos de Servicio. Si no los aceptas, no uses el Servicio. Al registrarte, confirmas que tienes al menos 16 años.',
      },
      {
        heading: '2. Descripción del servicio',
        body: 'Vysi es una plataforma que incluye un juego de aventura basado en GPS y un rastreador de vida personal. El Servicio se proporciona "tal cual" y puede ser modificado o discontinuado en cualquier momento.',
      },
      {
        heading: '3. Cuentas de usuario',
        body: '• Eres responsable de la seguridad de tu cuenta y contraseña.\n• No puedes compartir tus credenciales con otros.\n• Debes proporcionar información precisa durante el registro.\n• Nos reservamos el derecho de suspender o eliminar cuentas que violen estos términos.',
      },
      {
        heading: '4. Uso aceptable',
        body: 'No puedes:\n• Usar el Servicio para actividades ilegales\n• Intentar acceder a cuentas o datos de otros usuarios\n• Interferir con el funcionamiento del Servicio\n• Usar bots o herramientas automatizadas para acceder al Servicio\n• Publicar contenido ofensivo, difamatorio o inapropiado en el feed público',
      },
      {
        heading: '5. Contenido del usuario',
        body: 'El contenido que creas (entradas del tracker, datos de perfil) sigue siendo de tu propiedad. Concedes a Vysi una licencia limitada para almacenar y mostrar tu contenido público en el feed de la comunidad. El contenido privado es visible solo para ti.',
      },
      {
        heading: '6. Propiedad intelectual',
        body: 'El contenido del juego (historias, personajes, imágenes, acertijos) es propiedad de Vysi y está protegido por derechos de autor. No puedes copiar, distribuir o reproducir el contenido del juego sin permiso.',
      },
      {
        heading: '7. Datos de ubicación',
        body: 'El juego de aventura requiere acceso al GPS. Los datos de ubicación se utilizan únicamente para verificar tu proximidad a los lugares del juego y no se almacenan en nuestros servidores. Puedes revocar el acceso al GPS en cualquier momento desde la configuración de tu dispositivo.',
      },
      {
        heading: '8. Eliminación de cuenta',
        body: 'Puedes eliminar tu cuenta en cualquier momento desde la página de Perfil. Tu cuenta se desactivará inmediatamente y los datos personales se eliminarán permanentemente después de 30 días.',
      },
      {
        heading: '9. Limitación de responsabilidad',
        body: 'El Servicio se proporciona "tal cual", sin garantías de ningún tipo. Vysi no es responsable de:\n• Interrupciones o errores del Servicio\n• Pérdida de datos\n• Daños derivados del uso del Servicio\n• Lesiones durante el juego — presta siempre atención a tu entorno cuando juegas en movimiento',
      },
      {
        heading: '10. Cambios en los términos',
        body: 'Podemos actualizar estos términos. La fecha de última actualización se muestra arriba. El uso continuado del Servicio después de los cambios constituye la aceptación de los nuevos términos.',
      },
      {
        heading: '11. Contacto',
        body: 'Para preguntas sobre estos términos, contáctanos en: ${CONTACT_EMAIL}.',
      },
    ],
  },
}

function renderMarkdownLite(text: string) {
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

export default function TermsPage() {
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
        <Link href="/" className="hover:text-blue-600">Vysi</Link> · <Link href="/privacy" className="hover:text-blue-600">{locale === 'it' ? 'Privacy Policy' : locale === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}</Link>
      </footer>
    </div>
  )
}
