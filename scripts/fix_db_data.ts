
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Read env vars manually since we might not have dotenv
const envPath = path.resolve(process.cwd(), '.env.local')
let supabaseUrl = ''
let supabaseKey = ''

try {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '')
        }
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '')
        }
    }
} catch (e) {
    console.error("Could not read .env.local")
    process.exit(1)
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Searching for payment of 27000...")

    // 1. Find the record
    const { data: records, error: findError } = await supabase
        .from('payments')
        .select('*')
        .gt('amount', 20000) // Heuristic to find the 27000 one

    if (findError) {
        console.error("Error finding record:", findError)
        return
    }

    const recordToFix = records?.find(r => Math.abs(parseFloat(r.amount) - 27000) < 1)

    if (!recordToFix) {
        console.log("No record with amount 27000 found. It might have been fixed already.")
    } else {
        console.log(`Found record ${recordToFix.id} with amount ${recordToFix.amount}. Fixing...`)

        // 2. Update the record
        // 27000 / 400 = 67.5
        const newAmount = 67.50

        const { error: updateError } = await supabase
            .from('payments')
            .update({ amount: newAmount })
            .eq('id', recordToFix.id)

        if (updateError) {
            console.error("Error updating record:", updateError)
        } else {
            console.log("Successfully updated record to 67.50")
        }
    }
}

run()
