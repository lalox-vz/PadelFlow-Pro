"use client"

import Link from "next/link"
import { Facebook, Instagram, Twitter } from "lucide-react"
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"
import { useLanguage } from "@/context/LanguageContext"

export function Footer() {
    const { t } = useLanguage()

    return (
        <footer className="bg-gray-900 border-t border-gray-800">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
                    <div>
                        <h3 className="text-xl font-bold mb-4">OLIMPO</h3>
                        <p className="text-gray-400">
                            {t.footer?.description || "Transform your body and mind with our expert-led classes and state-of-the-art facilities."}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t.footer?.quick_links || "Quick Links"}</h3>
                        <ul className="space-y-2">
                            <li><Link href="/trainings" className="text-gray-400 hover:text-white transition-colors">{t.nav?.trainings || "Training"}</Link></li>
                            <li><Link href="/gallery" className="text-gray-400 hover:text-white transition-colors">{t.nav?.gallery || "Gallery"}</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors">{t.nav?.contact || "Contact"}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t.footer?.connect || "Connect"}</h3>
                        <div className="flex space-x-4">
                            <a href="https://instagram.com/olimpofitnessve" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                <Instagram className="h-6 w-6" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Facebook className="h-6 w-6" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Twitter className="h-6 w-6" />
                            </a>
                            <a href="https://wa.me/584142605230" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                <WhatsAppIcon className="h-6 w-6" />
                            </a>
                        </div>
                        <div className="mt-4">
                            <p className="text-gray-400 text-sm">Caracas, Venezuela 1080</p>
                            <p className="text-gray-400 text-sm">+58 414-260-5230</p>
                        </div>
                    </div>
                </div>
                <div className="mt-8 border-t border-gray-800 pt-8 md:flex md:items-center md:justify-between">
                    <p className="mt-8 text-base text-gray-400 md:mt-0 md:order-1" suppressHydrationWarning>
                        &copy; {new Date().getFullYear()} Olimpo Gym. {t.footer?.rights || "All rights reserved."}
                    </p>
                </div>
            </div>
        </footer>
    )
}
