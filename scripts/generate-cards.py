from pathlib import Path
import runpy
out=Path(__file__).resolve().parent.parent/'dist/assets/cards'
out.mkdir(parents=True,exist_ok=True)
suits={'S':'♠','H':'♥','C':'♣','D':'♦'}
# Exact vector glyphs keep all 52 ranks and suits consistent and readable.
positions={1:[(125,175)],2:[(125,112),(125,238)],3:[(125,104),(125,175),(125,246)],4:[(85,112),(165,112),(85,238),(165,238)],5:[(85,112),(165,112),(125,175),(85,238),(165,238)],6:[(85,104),(165,104),(85,175),(165,175),(85,246),(165,246)],7:[(85,104),(165,104),(125,139),(85,175),(165,175),(85,246),(165,246)],8:[(85,104),(165,104),(125,139),(85,175),(165,175),(125,210),(85,246),(165,246)],9:[(85,94),(165,94),(85,148),(165,148),(125,175),(85,202),(165,202),(85,256),(165,256)],10:[(85,94),(165,94),(125,120),(85,148),(165,148),(85,202),(165,202),(125,230),(85,256),(165,256)]}
for s,sym in suits.items():
 for rank in range(1,14):
  label={1:'A',11:'J',12:'Q',13:'K'}.get(rank,str(rank));name=f'{s}_{label if rank==1 or rank>10 else str(rank).zfill(2)}.svg';color='#b63445' if s in 'HD' else '#183b42'
  corner_suit=f'<text x="207" y="55" font-size="44">{sym}</text>' if rank>10 else ''
  pieces=[f'<svg xmlns="http://www.w3.org/2000/svg" width="250" height="350" viewBox="0 0 250 350"><rect width="250" height="350" rx="13" fill="#faf9f4"/><rect x="7" y="7" width="236" height="336" rx="8" fill="none" stroke="#d7d6c9"/><g fill="{color}" font-family="Georgia,DejaVu Serif,serif" text-anchor="middle"><text x="38" y="58" font-size="54">{label}</text>{corner_suit}<g transform="rotate(180 125 175)"><text x="38" y="58" font-size="54">{label}</text>{corner_suit}</g>']
  if rank<=10:
   for x,y in positions[rank]:
    size=105 if rank==1 else 45
    pieces.append(f'<text x="{x}" y="{y}" dominant-baseline="central" font-size="{size}">{sym}</text>')
  else:
   pieces.append(f'<rect x="61" y="86" width="128" height="178" rx="4" fill="none" stroke="#beaa72" stroke-width="2"/><path d="M67 106L125 91L183 106M67 244L125 259L183 244" stroke="#beaa72" fill="none"/><text x="125" y="191" font-size="93">{label}</text><text x="125" y="234" font-size="40">{sym}</text>')
  pieces.append('</g></svg>');svg=''.join(pieces);(out/name).write_text(svg,encoding='utf-8')
(out.parent/'favicon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#153b39"/><text x="32" y="49" text-anchor="middle" font-size="49" fill="#dfc080">♠</text></svg>')

# Rebuild the bundle after regenerating all default faces.
runpy.run_path(str(Path(__file__).with_name('bundle-cards.py')))
