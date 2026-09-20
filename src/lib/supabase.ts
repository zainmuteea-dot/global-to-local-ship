import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://wviryamcttjppbodqaal.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aXJ5YW1jdHRqcHBib2RxYWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4Njk0OTYsImV4cCI6MjEwNTQ0NTQ5Nn0.kLGCR8x8Rixr5GFegcgnyP-krzrP2cuiIfFdXBap_A0'
)
