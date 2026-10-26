import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(process.env.REACT_APP_SUPABASE_URL || 'https://buwpfzsnbdxdurrdwaao.supabase.co',process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1d3BmenNuYmR4ZHVycmR3YWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDIyODMsImV4cCI6MjEwODExODI4M30.HaWF-pNXtWGuN5zAjqznFTuKxXk8a5C06k5FhcTSpuA')
