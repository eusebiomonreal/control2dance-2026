
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function countUsers() {
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 100
        });

        if (error) {
            console.error('Error:', error);
            break;
        }

        allUsers = allUsers.concat(data.users);
        if (data.users.length < 100) {
            hasMore = false;
        } else {
            page++;
        }
    }

    console.log(`Total users in Supabase Auth: ${allUsers.length}`);
}

countUsers();
