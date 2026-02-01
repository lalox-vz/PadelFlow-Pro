
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local')
const envFile = fs.readFileSync(envPath, 'utf8')
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=')
    if (key && val) acc[key.trim()] = val.trim().replace(/^["']|["']$/g, '')
    return acc
}, {} as Record<string, string>)

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

async function checkColumns() {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error selecting:', error)
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
    } else {
        console.log('No data found, cannot infer columns easily via select *')
        // Attempt insert to see error? No.
    }
}

checkColumns()
