import { serve } from 'https://deno.land/std@0.137.0/http/server.ts'
import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'

const head = '<html><head><title>Everett Bogue\'s Website on the World Wide Web</title></head><body>'

const foot = '</body></html>'

function body () { 
  return head + Marked.parse(Deno.readTextFileSync('./post.md')).content + foot
}

serve(() => new Response(body(), { 
    headers: { "content-type": "text/html; charset=utf-8"}
}))
