import { serve } from 'https://deno.land/std@0.137.0/http/server.ts'
//import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'
export * as gfm from "https://deno.land/x/gfm@0.1.20/mod.ts";


const head = '<html><head><title>Everett Bogue\'s Website on the World Wide Web</title><meta name="viewport" content="width=device-width initial-scale=1" /><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/></head><body>'

const foot = '</body></html>'

const content = await Deno.readTextFile('./post.md')

function body () { 
  return head + gfm.render(content) + foot
}

serve(() => new Response(body(), { 
    headers: { "content-type": "text/html; charset=utf-8"}
}))
