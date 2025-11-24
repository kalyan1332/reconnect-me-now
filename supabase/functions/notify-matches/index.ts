import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { matchId } = await req.json()

    // Get match details
    const { data: match, error: matchError } = await supabaseClient
      .from('matches')
      .select(`
        *,
        lost_item:items!matches_lost_item_id_fkey(*),
        found_item:items!matches_found_item_id_fkey(*)
      `)
      .eq('id', matchId)
      .single()

    if (matchError) throw matchError

    // Get user IDs from profiles based on contact info
    // This is a simplified version - in production you'd have proper user_id linking
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('user_id, contact_number')

    if (profiles) {
      // Find users who reported these items
      for (const profile of profiles) {
        if (match.lost_item.contact_info.includes(profile.contact_number) ||
            match.found_item.contact_info.includes(profile.contact_number)) {
          
          // Create notification
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: profile.user_id,
              type: 'match',
              title: 'New Match Found!',
              message: `We found a potential match for "${match.lost_item.title}". Check your dashboard to review.`,
              item_id: match.lost_item.id,
              match_id: matchId,
            })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
