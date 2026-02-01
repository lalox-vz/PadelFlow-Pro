
import React from 'react'
import { cn } from '@/lib/utils'

interface OlimpoLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string
}

export const OlimpoLogo = ({ className, ...props }: OlimpoLogoProps) => {
    return (
        <svg
            viewBox="0 0 300 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("h-10 w-auto text-foreground", className)}
            {...props}
        >
            <text
                x="10"
                y="55"
                className="font-black tracking-tighter"
                fontSize="48"
                fontFamily="sans-serif"
                fill="currentColor"
            >
                PadelFlow
            </text>
            <circle cx="270" cy="25" r="5" fill="#ccff00" />
        </svg>
    )
}
