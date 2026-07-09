//Create and export the one Supabase Client instance to be used across the application

const {createClient} = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = supabase;