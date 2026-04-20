import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTestUser() {
  const phone = '+917488288878';
  
  console.log(`Creating test user for ${phone}...`);

  // 1. Create in Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    phone: phone,
    password: 'RozgarPassword123!',
    phone_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already exists')) {
      console.log('User already exists in Auth.');
    } else {
      console.error('Auth Error:', authError);
      return;
    }
  } else {
    console.log('User created in Auth.');
  }

  console.log('Test user setup complete.');
}

createTestUser();
