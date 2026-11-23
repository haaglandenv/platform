"""Build the HV Control web shell. JavaScript bundling is the next root build step."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parent
WEB = ROOT / 'web'
DIST = ROOT / 'dist'
# Keep the original local images and licensed fonts as the single asset source.
assets = ROOT / 'assets'
if not assets.is_dir():
    raise SystemExit('Ontbrekende assets/: herstel de lokale beeld- en fontbron.')
if DIST.exists():
    shutil.rmtree(DIST)
DIST.mkdir()
shutil.copytree(assets, DIST / 'assets')
(DIST / 'index.html').write_text((WEB / 'index.html').read_text(encoding='utf-8'), encoding='utf-8')
styles = ['legacy-shell.css', 'legacy-polish.css', 'legacy-rows.css', 'app.css']
(DIST / 'site.css').write_text('\n'.join((WEB / name).read_text(encoding='utf-8') for name in styles), encoding='utf-8')
manifest = {'id':'./','name':'Haaglanden Voetbal · HV Control','short_name':'HV Control','lang':'nl','start_url':'./#home','scope':'./','display':'standalone','background_color':'#fbfcf8','theme_color':'#0e2e22','icons':[{'src':'assets/hv-app-192.png','sizes':'192x192','type':'image/png'},{'src':'assets/hv-app-512.png','sizes':'512x512','type':'image/png','purpose':'any maskable'}]}
(DIST / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
# Retire the old browser-only demo worker. Never cache authenticated API responses.
(DIST / 'sw.js').write_text("""self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('hv-control-demo-'))await caches.delete(name);await self.clients.claim();await self.registration.unregister();})()));
""",encoding='utf-8')
print('Web Shell, lokale assets, CSS en manifest gebouwd; bundel web/app.js via de rootbuild.')
