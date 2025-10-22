import { Hono } from "jsr:@hono/hono";
import { serveStatic } from "jsr:@hono/hono/deno";
import { marked } from "https://esm.sh/gh/evbogue/bog5@de70376265/lib/marked.esm.js";

const app = new Hono()

const head = await Deno.readTextFile('./head.html')

const foot = await Deno.readTextFile('./foot.html')

app.get('/', async (c) => {
  const doc = await Deno.readTextFile('./README.md')
  return c.html(head + marked(doc) + foot)
})

export default app
