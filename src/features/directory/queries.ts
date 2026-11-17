import 'server-only';
import { sessionClient, throwIfError } from '@/lib/supabase/session';
import type { Database } from '@/types/database';

// The member directory (roles.md §3): active members with their names and roles; the board also
// sees phone numbers (account_private RLS). Emails stay in auth.users and are never listed.

type AppRole = Database['public']['Enums']['app_role'];

export type DirectoryEntry = {
  userId: string;
  name: string;
  role: AppRole;
  joinedOn: string | null;
  phone: string | null;
};

export async function listDirectory(withContacts: boolean): Promise<DirectoryEntry[]> {
  const supabase = await sessionClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('memberships')
    .select(
      'user_id, role, joined_on, account:accounts!memberships_user_id_fkey(display_name, deactivated_at)',
    )
    .eq('status', 'active');
  throwIfError(error);
  const members = (data ?? []).filter((row) => row.account && !row.account.deactivated_at);

  const phones = new Map<string, string>();
  if (withContacts && members.length > 0) {
    const { data: contacts, error: contactsError } = await supabase
      .from('account_private')
      .select('account_id, phone')
      .in(
        'account_id',
        members.map((row) => row.user_id),
      );
    throwIfError(contactsError);
    for (const contact of contacts ?? []) {
      if (contact.phone) phones.set(contact.account_id, contact.phone);
    }
  }

  return members.map((row) => ({
    userId: row.user_id,
    name: row.account?.display_name ?? '',
    role: row.role,
    joinedOn: row.joined_on,
    phone: phones.get(row.user_id) ?? null,
  }));
}
