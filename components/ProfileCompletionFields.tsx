'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

interface ProfileCompletionFieldsProps {
  name: string
  onNameChange: (value: string) => void
  // Whether to show the privacy/terms consent checkbox (OAuth users who have
  // already accepted don't see it again).
  showPrivacy: boolean
  privacyAccepted: boolean
  onPrivacyChange: (checked: boolean) => void
  nameError?: string
  privacyError?: string
}

// The shared "who are you + do you consent" fields used by both the email
// register step (login page) and the OAuth /complete-profile page. Extracting
// this keeps the privacy/terms links — which matter legally — defined once
// instead of copy-pasted in two places that had already drifted. Each caller
// still owns its <form>, submit button, and submit handler.
export function ProfileCompletionFields({
  name,
  onNameChange,
  showPrivacy,
  privacyAccepted,
  onPrivacyChange,
  nameError,
  privacyError,
}: ProfileCompletionFieldsProps) {
  const { t } = useLocale()
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">{t('auth.name')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={100}
          autoFocus
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
        {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
      </div>
      {showPrivacy && (
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => onPrivacyChange(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-brand-border text-brand-green focus:ring-brand-green"
          />
          <span className="text-sm text-brand-gray">
            {t('auth.acceptPrivacy')}{' '}
            <Link href="/privacy" target="_blank" className="text-brand-green hover:underline">
              {t('auth.privacyPolicy')}
            </Link>
            {' & '}
            <Link href="/terms" target="_blank" className="text-brand-green hover:underline">
              {t('auth.termsOfService')}
            </Link>
          </span>
        </label>
      )}
      {privacyError && <p className="text-xs text-red-500">{privacyError}</p>}
    </>
  )
}
