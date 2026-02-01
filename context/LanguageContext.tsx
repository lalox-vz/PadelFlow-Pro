"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { dictionary, Language } from "@/lib/dictionary"

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: typeof dictionary['es']
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'es',
    setLanguage: () => { },
    t: dictionary['es'],
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('es')

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t: dictionary[language] }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => useContext(LanguageContext)
