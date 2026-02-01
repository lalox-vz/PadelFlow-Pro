import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://olimpo-five.vercel.app'

    // Public routes that should be indexed
    const routes = [
        '',
        '/trainings',
        '/pricing',
        '/contact',
        '/gallery',
        '/login',
        '/signup',
    ]

    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' || route === '/trainings' ? 'daily' : 'weekly',
        priority: route === '' ? 1 : 0.8,
    }))
}
