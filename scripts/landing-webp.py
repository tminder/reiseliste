# Wandelt die Fotos aus landing-shots.ts in WebP um (560 × 956, wie in den Landingpages angegeben) und löscht die PNG (R-001)
from pathlib import Path
from PIL import Image
for png in sorted(Path('public/landing').glob('*-[123].png')):
    Image.open(png).convert('RGB').resize((560, 956), Image.LANCZOS).save(png.with_suffix('.webp'), quality=82, method=6)
    png.unlink()
    print(png.with_suffix('.webp'))
