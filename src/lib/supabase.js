import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://diwqgwwppplvzqkqsrie.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpd3Fnd3dwcHBsdnpxa3FzcmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MDEzOTMsImV4cCI6MjA2NDE3NzM5M30.25Y4-4y3u8zDofs-YRWcthp0aEJ65PPFhQza2CuTQ8k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabase() {
  return supabase;
}

async function addClass({ title, description, date, start_time, end_time, user }) {
  const { data, error } = await supabase
    .from('classes')
    .insert([{
      title,
      description,
      date,
      start_time,
      end_time,
      created_by: user.id, // 또는 teacher: user.name
    }]);
  if (error) throw error;
  return data;
}

async function fetchMyClasses(user) {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('created_by', user.id); // 또는 .eq('teacher', user.name)
  if (error) throw error;
  return data;
}