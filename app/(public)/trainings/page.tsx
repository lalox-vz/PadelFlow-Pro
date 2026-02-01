import { Metadata } from 'next'
import TrainingsClient from './TrainingsClient'

export const metadata: Metadata = {
    title: 'Entrenamientos y Horarios',
    description: 'Consulta nuestro calendario de entrenamiento. Clases de CrossFit, Yoga, Funcional y más. Reserva tu lugar en Olimpo Fitness.',
    openGraph: {
        title: 'Entrenamientos y Horarios | Olimpo Fitness',
        description: 'Consulta nuestro calendario de entrenamiento. Clases de CrossFit, Yoga, Funcional y más.',
    },
}

export default function TrainingsPage() {
    return <TrainingsClient />
}
