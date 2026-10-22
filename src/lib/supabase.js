import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://nxqprxnkhjiumzedeugk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cXByeG5raGppdW16ZWRldWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjczMzYsImV4cCI6MjEwODIwMzMzNn0.Unp88GSkzdXyqzKJBsqFgfFi15NvZKOTHdN5xoHxdjE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
