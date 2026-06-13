# Fleet dog asset library

Paid + free pixel dog packs — **copy this whole folder** into any project. Canonical source; mirrored to MeniscusMaximus, PixelSports, TradeGame, DrivingMeNuts, CodeMonkeys.

## Pixelcave (purchased — commercial OK)

| Breed | Sheet | Frame size | Animations |
|-------|-------|------------|------------|
| **Pomeranian** (Pat memorial) | `pixelcave/pomeranianasset-grid.png` | 29×26 px | jump, idle×2, sit, walk, run, sniff, sniff-walk |
| Corgi (no tail) | `pixelcave/corgi-asset-notail.png` | 32×32 px | same layout |
| French bulldog | `pixelcave/frenchbulldogasset-grid.png` | — | same layout |
| Poodle | `pixelcave/poodleasset-grid.png` | — | same layout |
| Pug | `pixelcave/pugasset-grid.png` | — | same layout |
| Schnauzer | `pixelcave/schnauzer-grid.png` | — | same layout |

- Purchase: [Pixel Doggos Sprites](https://pixelcave.itch.io/pixel-doggos-sprites) / [Animated Pomeranian](https://pixelcave.itch.io/animated-pomeranian-sprites)
- **Credit appreciated** (Pixelcave). Do not resell individual sheets.
- **Pat (black Pom):** sheet is white/cream Pom — recolor coat to black, keep/add white chest + front paws in Aseprite/Pixelorama.

## LuizMelo (CC0 — free)

`luizmelo-pet-dogs/Pet Dogs Pack/` — Golden Retriever, Akita, Great Dane, Schnauzer, Saint Bernard, Husky. 11 animations each (idle, walk, run, bark, sit, …).

- Source: [Pet Dogs Pack](https://luizmelo.itch.io/pet-dogs-pack) (CC0)

## Runtime helper

`pixelcave-dog.js` — canvas sprite-sheet player for Pixelcave grids:

```html
<script src="/static/assets/dogs/pixelcave-dog.js"></script>
<script>
  PixelcaveDog.mount(document.getElementById("host"), {
    sheet: "/static/assets/dogs/pixelcave/pomeranianasset-grid.png",
    anim: "idle1",
    scale: 4,
  });
</script>
```

## Fleet policy

**Dogs everywhere.** Side quests, idle companions, shop mascots, loading screens, memorial scenes — prefer these sheets over one-off programmer art. Meniscus Maximus keeps `mm-dog.js` for the canon mascot; purchased breeds fill Pat, NPC dogs, and cross-project reuse.

## Review gallery

Open `review.html` in a browser (or serve the folder):

```bash
cd static/assets/dogs && python3 -m http.server 8778
```

See `ATTRIBUTION.md` for license rows per pack.
