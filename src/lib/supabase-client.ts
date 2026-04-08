import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = 'https://zqoywwtdsbtqtytvyzwl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxb3l3d3Rkc2J0cXR5dHZ5endsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODcxODYsImV4cCI6MjA5MTA2MzE4Nn0.r2NXJ5bh9fYntoZoDaMFYUmdp5u5zJC9zYJ46gZVWuM';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
