import { Navbar } from "@/components/marketing/Navbar"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
        </div>
    )
}
