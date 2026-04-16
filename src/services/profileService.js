import { supabase } from './supabase';

export const profileService = {
  /**
   * Get current user's profile and their organization
   */
  async getMyProfile(passedUser = null) {
    try {
      const user = passedUser || (await supabase.auth.getUser()).data.user;
      if (!user) return null;

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Profile not found for user:', user.id);
        // Don't throw here, just return what we have (user but no extra profile data)
        return { user, organization: null, roleInOrg: null };
      }

    // Fetch Organization (Fournisseur) linked to this user
    // Assuming user_profile has a link OR querying suppliers where user is staff
    // Based on schema 'fournisseurs.user_profile_id' is one link, 'fournisseur_staff' is another.
    // We check matches in 'fournisseur_staff' first as it's more generic involved.
    
    // 1. Try Staff Link
    let { data: staffLink } = await supabase
      .from('fournisseur_staff')
      .select('fournisseur_id, role, fournisseurs(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    let organization = staffLink?.fournisseurs;
    let roleInOrg = staffLink?.role;

    // 2. If no staff link, check if main owner (user_profile_id on fournisseurs)
    if (!organization) {
      const { data: ownerLink } = await supabase
        .from('fournisseurs')
        .select('*')
        .eq('user_profile_id', user.id)
        .maybeSingle();
      
      if (ownerLink) {
        organization = ownerLink;
        roleInOrg = 'OWNER';
      }
    }

      return {
        user: { ...user, ...profile },
        organization,
        roleInOrg
      };
    } catch (err) {
      console.error('[profileService] Critical error in getMyProfile:', err);
      if (err.message) console.error('[profileService] Error message:', err.message);
      if (err.details) console.error('[profileService] Error details:', err.details);
      if (err.hint) console.error('[profileService] Error hint:', err.hint);
      return null;
    }
  },

  /**
   * Get all staff members for a specific organization
   */
  async getOrgStaff(orgId) {
    // Join fournisseur_staff with user_profile
    const { data, error } = await supabase
      .from('fournisseur_staff')
      .select(`
        id,
        role,
        created_at,
        user_profile (
          id,
          full_name,
          email,
          phone_number,
          department
        )
      `)
      .eq('fournisseur_id', orgId);

    if (error) throw error;

    // Flatten for easy display
    return data.map(item => ({
      id: item.id, // staff record id
      userId: item.user_profile?.id,
      name: item.user_profile?.full_name || 'N/A',
      email: item.user_profile?.email || 'N/A',
      role: item.role,
      department: item.user_profile?.department || 'N/A',
      joinedAt: item.created_at
    }));
  },

  /**
   * Update Organization Information
   */
  async updateOrganization(orgId, updates) {
    const { data, error } = await supabase
      .from('fournisseurs')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update the current user's profile (first_name, last_name, etc.)
   */
  async updateMyProfile(userId, updates) {
    const { data, error } = await supabase
      .from('user_profile')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Save CCC (Conseil Café Cacao) access credentials
   * Stored in the metadata JSONB column of fournisseurs
   */
  async saveCCCCredentials(orgId, credentials) {
    console.log('[profileService] Fetching current metadata for orgId:', orgId);
    // Get current metadata first to merge
    const { data: current, error: fetchError } = await supabase
      .from('fournisseurs')
      .select('metadata')
      .eq('id', orgId)
      .single();

    if (fetchError) {
      console.error('[profileService] Error fetching metadata:', fetchError);
      throw fetchError;
    }

    console.log('[profileService] Current metadata:', current?.metadata);

    const updatedMetadata = {
      ...(current?.metadata || {}),
      ccc_credentials: {
        browser_user: credentials.browser_user,
        browser_pass: credentials.browser_pass,
        login_user: credentials.login_user,
        login_pass: credentials.login_pass,
        updated_at: new Date().toISOString(),
      }
    };

    console.log('[profileService] Updating fournisseur with metadata:', updatedMetadata);

    const { data, error } = await supabase
      .from('fournisseurs')
      .update({ metadata: updatedMetadata })
      .eq('id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[profileService] Error updating metadata:', error);
      throw error;
    }

    console.log('[profileService] Meta data updated successfully');
    return data;
  },

  /**
   * Get CCC credentials from the organization's metadata
   */
  async getCCCCredentials(orgId) {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('metadata')
      .eq('id', orgId)
      .single();

    if (error) throw error;
    return data?.metadata?.ccc_credentials || null;
  }
};
