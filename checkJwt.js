// checkJwt.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkJwt() {
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: 'ruhi@gmail.com',
      password: '123456', // 
    });
    if (signInError) throw signInError;

    const { data: { session } } = await supabase.auth.getSession();
    console.log('JWT user_metadata:', session.user.user_metadata);
    console.log('Full JWT:', session.access_token);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkJwt();