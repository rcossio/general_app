'use client'

import { createContext, useContext, useState } from 'react'

interface ChromeContextValue {
  hideChrome: boolean
  setHideChrome: (value: boolean) => void
}

const ChromeContext = createContext<ChromeContextValue>({
  hideChrome: false,
  setHideChrome: () => {},
})

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [hideChrome, setHideChrome] = useState(false)
  return (
    <ChromeContext.Provider value={{ hideChrome, setHideChrome }}>
      {children}
    </ChromeContext.Provider>
  )
}

export function useChrome() {
  return useContext(ChromeContext)
}
