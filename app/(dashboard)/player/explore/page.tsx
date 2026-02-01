"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, MapPin, Dumbbell, Landmark } from "lucide-react"

export default function ExplorePage() {
    const { user, profile } = useAuth()
    const [city, setCity] = useState("Tu Ciudad")
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<'all' | 'club' | 'academy'>('all')

    // Mock Data for "Auto Discovery"
    const [allVenues, setAllVenues] = useState<any[]>([])
    const [filteredVenues, setFilteredVenues] = useState<any[]>([])

    useEffect(() => {
        if (profile?.city) {
            setCity(profile.city)
        }

        // Mock Database of Clubs & Academies
        const mockClubs = [
            {
                id: 1,
                name: "Padel Center Caracas",
                location: "Las Mercedes, Caracas",
                type: "club",
                price: "$20/hr",
                image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2070&auto=format&fit=crop"
            },
            {
                id: 2,
                name: "Club de Campo",
                location: "La Lagunita, Caracas",
                type: "club",
                price: "$25/hr",
                image: "https://images.unsplash.com/photo-1626224583764-847890e058f5?q=80&w=2070&auto=format&fit=crop"
            },
            {
                id: 3,
                name: "Ace Padel Academy",
                location: "Altamira, Caracas",
                type: "academy",
                program: "Pro Training",
                image: "https://images.unsplash.com/photo-1599474924187-334a405be6b3?q=80&w=2070&auto=format&fit=crop"
            },
            {
                id: 4,
                name: "Elite Padel Valencia",
                location: "Valencia, Carabobo",
                type: "club",
                price: "$22/hr",
                image: "https://images.unsplash.com/photo-1626224583764-847890e058f5?q=80&w=2070&auto=format&fit=crop"
            },
            {
                id: 5,
                name: "Top Spin Academy",
                location: "Barquisimeto",
                type: "academy",
                program: "Clínicas Kids",
                image: "https://images.unsplash.com/photo-1601056639638-34927cb826d9?q=80&w=2000&auto=format&fit=crop"
            },
        ]

        setAllVenues(mockClubs)
        setFilteredVenues(mockClubs)

    }, [profile])

    // Search & Filter Logic
    useEffect(() => {
        let results = allVenues

        // 1. Text Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase()
            results = results.filter(v =>
                v.name.toLowerCase().includes(lowerQuery) ||
                v.location.toLowerCase().includes(lowerQuery)
            )
        }

        // 2. Type Filter
        if (filterType !== 'all') {
            results = results.filter(v => v.type === filterType)
        }

        setFilteredVenues(results)
    }, [searchQuery, filterType, allVenues])


    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl h-[240px]">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-purple-900/40 z-0"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-0"></div>

                <div className="relative z-10 p-8 sm:p-12 flex flex-col items-center text-center justify-center h-full space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                        Encuentra tu próximo <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-green-500">Juego</span>
                    </h1>
                    <p className="text-gray-300 max-w-2xl text-lg">
                        Explora los mejores clubes y academias.
                    </p>
                </div>
            </div>

            {/* Smart Search Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clubs Search */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${filterType === 'club' ? 'ring-2 ring-[#ccff00]' : 'border-l-4 border-l-[#ccff00]'}`}
                    onClick={() => setFilterType(filterType === 'club' ? 'all' : 'club')}
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 rounded-full bg-[#ccff00]/10 text-[#ccff00]"><Landmark className="h-5 w-5" /></div>
                            <CardTitle>Clubs & Reservas</CardTitle>
                        </div>
                        <CardDescription>Haz clic para filtrar solo clubes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar club..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-[#ccff00]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Academy Search */}
                <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${filterType === 'academy' ? 'ring-2 ring-blue-500' : 'border-l-4 border-l-blue-500'}`}
                    onClick={() => setFilterType(filterType === 'academy' ? 'all' : 'academy')}
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 rounded-full bg-blue-500/10 text-blue-500"><Dumbbell className="h-5 w-5" /></div>
                            <CardTitle>Academias & Entrenamientos</CardTitle>
                        </div>
                        <CardDescription>Haz clic para filtrar solo academias.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar academia o coach..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-blue-500"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Results Section */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <MapPin className="text-[#ccff00] h-6 w-6" />
                        {searchQuery || filterType !== 'all' ? `Resultados (${filteredVenues.length})` : `Destacados en ${city}`}
                    </h2>
                    {filteredVenues.length === 0 && (
                        <p className="text-muted-foreground">No se encontraron resultados.</p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {filteredVenues.map((club) => (
                        <div key={club.id} className="group overflow-hidden rounded-xl bg-card border border-border shadow-md hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                            <div className="relative h-48 w-full overflow-hidden">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10"></div>
                                <img src={club.image} alt={club.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white z-20">
                                    {club.type === 'club' ? '🎾 Club' : '🎓 Academia'}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-indigo-500 transition-colors">{club.name}</h3>
                                <div className="flex items-center text-muted-foreground text-sm mb-4">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {club.location}
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-sm font-medium bg-muted px-2 py-1 rounded text-foreground">
                                        {club.type === 'club' ? club.price : club.program}
                                    </span>
                                    <Button size="sm" variant="secondary" className="group-hover:bg-[#ccff00] group-hover:text-black font-medium transition-colors">
                                        Ver Detalles
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
