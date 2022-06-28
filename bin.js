import { serve } from 'https://deno.land/std@0.137.0/http/server.ts'
//import { Marked } from 'https://deno.land/x/markdown@v2.0.0/mod.ts'
import * as gfm from "https://deno.land/x/gfm@0.1.20/mod.ts";

const style = await Deno.readTextFile('./style.css')

const head = '<html><head><title>Everett Bogue\'s Website on the World Wide Web</title><meta name="viewport" content="width=device-width initial-scale=1" /><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><style>'+ style + '</style></head><body><img src="https://avatars.githubusercontent.com/u/2468866?v=4" style="float:left; width: 175px; height: 175px; margin-right: 1em; margin-bottom: 1em;">'

const foot = '<iframe src="https://denobook.com/#ELwPcMFe0kRF9luXO7qDSKXsiCOuQR27JT23L3gz3AE=" width="100%;" height="680px;"></iframe></body></html>'

const content = await Deno.readTextFile('./post.md')

function body () { 
  return head + gfm.render(content) + foot
}

serve(() => new Response(body(), { 
    headers: { "content-type": "text/html; charset=utf-8"}
}))
