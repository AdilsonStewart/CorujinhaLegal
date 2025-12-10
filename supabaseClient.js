// 📁 supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kuwsgvhjmjnhkteleczc.supabase.co';
const supabaseKey = 'sb_publishable_Rgq_kYySn7XB-zPyDG1_Iw_YEVt8O2P';

export const supabase = createClient(supabaseUrl, supabaseKey);
