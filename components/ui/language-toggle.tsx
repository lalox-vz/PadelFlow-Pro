"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/context/LanguageContext"

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage()

    return (
        <div className="flex items-center gap-2">
            <Button
                variant={language === 'es' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('es')}
                className={`w-12 px-0 ${language === 'es' ? '' : 'text-foreground hover:bg-accent'}`}
            >
                ES
            </Button>
            <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLanguage('en')}
                className={`w-12 px-0 ${language === 'en' ? '' : 'text-foreground hover:bg-accent'}`}
            >
                EN
            </Button>
        </div>
    )
}
