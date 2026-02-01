import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { message } = await request.json()

        const apiKey = process.env.CALLMEBOT_API_KEY
        const phone = process.env.ADMIN_PHONE_NUMBER // Format: +58414...

        if (!apiKey || !phone) {
            console.error('CallMeBot API Key or Phone missing')
            // Don't fail the request to the client, just log error
            return NextResponse.json({ success: false, error: 'Configuration missing' }, { status: 500 })
        }

        const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`

        // Trigger the CallMeBot API
        // We don't await the result to avoid blocking the user response if external API is slow
        fetch(url).catch(err => console.error('CallMeBot Error:', err))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Notification Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 })
    }
}
