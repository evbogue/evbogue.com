import { serve } from 'https://deno.land/std@0.137.0/http/server.ts'
import { post } from './post.js'

serve(() => new Response(post))
