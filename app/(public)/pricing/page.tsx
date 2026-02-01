import { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
    title: 'PadelFlow - Planes y Suscripciones',
    description: 'Únete a la comunida de pádel más grande. Planes Professional, Amateur y Rookie para todos los niveles.',
    openGraph: {
        title: 'PadelFlow | Planes y Precios',
        description: 'Encuentra el plan perfecto para potenciar tu juego.',
    },
}

export default function PricingPage() {
    return <PricingClient />
}
