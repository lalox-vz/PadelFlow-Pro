"use client"

import { SVGProps } from "react"

export function PadelRacketIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.36 6.64a9 9 0 0 1-12.73 0 9 9 0 0 1 0-12.73 9 9 0 0 1 12.73 12.73ZM12 19.37v2.63M9.88 19.37h4.24" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15.13v4.24" />
            <circle cx="12" cy="7" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="9.5" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="14.5" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
        </svg>
    )
}
