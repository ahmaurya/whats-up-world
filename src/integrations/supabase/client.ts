// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jcbfpihpwgqlncevckiu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYmZwaWhwd2dxbG5jZXZja2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjU3OTQsImV4cCI6MjA2NTUwMTc5NH0.YZmD-qObqYcIG7brgAkugDPkeY6WnoPIrFmMCGlCarw";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);