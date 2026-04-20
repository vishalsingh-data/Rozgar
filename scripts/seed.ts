import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function seed() {
  console.log('🌱 Starting seeding...');

  // 1. Insert Users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .insert([
      {
        role: 'customer',
        phone: '9100000001',
        name: 'Priya S',
        language_pref: 'english',
      },
      {
        role: 'worker',
        phone: '9100000002',
        name: 'Ravi K',
        language_pref: 'kannada',
      },
      {
        role: 'worker',
        phone: '9100000003',
        name: 'Raju Kumar',
        language_pref: 'kannada',
      },
      {
        role: 'partner_node',
        phone: '9100000004',
        name: 'Vikram Sharma',
      },
    ])
    .select();

  if (usersError) {
    console.error('Error inserting users:', usersError);
    return;
  }

  const priya = users.find((u) => u.phone === '9100000001')!;
  const ravi = users.find((u) => u.phone === '9100000002')!;
  const raju = users.find((u) => u.phone === '9100000003')!;
  const vikram = users.find((u) => u.phone === '9100000004')!;

  console.log('Inserted Users:');
  console.log(`- Priya (Customer): ${priya.id}`);
  console.log(`- Ravi (Worker): ${ravi.id}`);
  console.log(`- Raju (Worker): ${raju.id}`);
  console.log(`- Vikram (Partner Node): ${vikram.id}`);

  // 2. Insert Workers Profiles
  const { error: workersError } = await supabase.from('workers').insert([
    {
      user_id: ravi.id,
      type: 'skilled',
      raw_description: 'Electrician, fan repair, switch repair, wiring',
      skill_tags: ['electrician', 'fan repair', 'switch repair', 'wiring'],
      searchable_as: ['electrician', 'electrical', 'fan', 'wiring', 'repair'],
      pincode: '560068',
      adjacent_pincodes: ['560069', '560034'],
      rate_preference: 'per job',
      availability_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      caller_id: null,
    },
    {
      user_id: raju.id,
      type: 'daily_wage',
      raw_description: 'Daily wage labour, loading, moving, cleaning',
      skill_tags: ['labour', 'loading', 'moving', 'cleaning'],
      searchable_as: [
        'labour',
        'daily wage',
        'loading',
        'moving',
        'cleaning',
        'carrying',
      ],
      pincode: '560068',
      adjacent_pincodes: ['560069', '560034'],
      rate_preference: '₹400/day',
      availability_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      caller_id: '9100000003',
      partner_node_id: vikram.id,
    },
  ]);

  if (workersError) {
    console.error('Error inserting workers:', workersError);
    return;
  }

  console.log('✅ Seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Fatal error during seeding:', err);
});
