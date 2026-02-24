import { readFileSync, writeFileSync, copyFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = join(__dirname, '..', 'dist')
const base = (process.env.BASE_URL || '/').replace(/\/?$/, '/')

const manifestPath = join(dist, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
manifest.start_url = base
if (manifest.icons?.[0]) manifest.icons[0].src = base + 'favicon.svg'
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))
