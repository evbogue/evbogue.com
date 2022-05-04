import { serve } from 'https://deno.land/std@0.137.0/http/server.ts'

const head = '<html><head><title>Everett Bogue\'s Website on the World Wide Web</title></head><body>'

const foot = '</body></html>'

const body = head + Deno.readTextFileSync('./post.txt') + foot

serve(() => new Response(body, { 
    headers: { "content-type": "text/html; charset=utf-8"}
}))
