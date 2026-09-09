import { createClient } from '@supabase/supabase-js';

// URL และ Key ของโปรเจกต์คุณ (cperemcdomqcwvvolqaz)
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cperemcdomqcwvvolqaz.supabase.co';
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZXJlbWNkb21xY3d2dm9scWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NTI0NDAsImV4cCI6MjEwNDUyODQ0MH0.NfhxJnmoKaOmtXkf33TOG5IFzFOxIhAbYT2gcggqAMY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
