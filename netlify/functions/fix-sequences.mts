import { createClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL') || Netlify.env.get('SUPABASE_URL');
  const serviceRoleKey = Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const tables = ['comenzi', 'doctori', 'pacienti', 'produse', 'comanda_produse', 'tehnicieni'];
  const results: Record<string, any> = {};

  for (const table of tables) {
    // Fetch the current max ID
    const { data: maxRow, error: fetchError } = await supabase
      .from(table)
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (fetchError) {
      results[table] = { error: fetchError.message };
      continue;
    }

    const maxId = maxRow && maxRow[0] ? Number(maxRow[0].id) : 0;

    // Try inserting a dummy row with a high ID to force the sequence forward,
    // then delete it. This effectively resets the sequence.
    const forcedId = maxId + 1000;

    const { data: inserted, error: insertError } = await supabase
      .from(table)
      .insert([{ id: forcedId, ...(getMinimalRow(table)) }])
      .select('id')
      .single();

    if (insertError) {
      results[table] = { maxId, error: `Insert failed: ${insertError.message}` };
      continue;
    }

    // Delete the dummy row
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', forcedId);

    results[table] = {
      maxId,
      sequenceAdvancedTo: forcedId,
      cleaned: !deleteError,
      status: 'fixed',
    };
  }

  return Response.json({ message: 'Sequence fix completed', results });
};

function getMinimalRow(table: string): Record<string, any> {
  switch (table) {
    case 'comenzi':
      return {
        id_doctor: 1,
        id_pacient: 1,
        data_start: '2000-01-01',
        termen_limita: '2000-01-01',
        reducere: 0,
        total: 0,
        status: 'În progres',
      };
    case 'doctori':
      return { nume: '__temp_sequence_fix__', email: '', telefon: '' };
    case 'pacienti':
      return { nume: '__temp_sequence_fix__', id_doctor: 1 };
    case 'produse':
      return { nume: '__temp_sequence_fix__', pret: 0 };
    case 'comanda_produse':
      return { comanda_id: 1, produs_id: 1, cantitate: 0 };
    case 'tehnicieni':
      return { nume: '__temp_sequence_fix__' };
    default:
      return {};
  }
}
