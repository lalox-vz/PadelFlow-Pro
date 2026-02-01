import { OlimpoLogo } from "@/components/icons/OlimpoLogo";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 text-white">
            <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-[#ccff00]/20 rounded-full blur-xl animate-pulse"></div>

                {/* Logo Pulse */}
                <div className="relative animate-bounce">
                    <OlimpoLogo className="h-24 w-24 text-[#ccff00]" />
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2">
                <span className="text-xl font-bold tracking-tight">PadelFlow</span>
                <span className="text-sm text-zinc-500 animate-pulse">Cargando tu experiencia...</span>
            </div>
        </div>
    );
}
