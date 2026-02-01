import { Metadata } from 'next'
import HomeClient from './HomeClient'

// Root layout handles default metadata, but we can be specific here if needed.
// For now, inheriting defaults is fine, but I'll add a canonical tag URL just in case.

export const metadata: Metadata = {
    alternates: {
        canonical: 'https://olimpo-five.vercel.app',
    },
}

export default function HomePage() {
    return <HomeClient />
}
