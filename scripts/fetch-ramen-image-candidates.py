"""Fetch already researched CC BY-SA candidate photos for manual visual verification.
Never changes storefront mappings or contacts the database.
"""
import json
import pathlib
import time
import urllib.request

research = pathlib.Path(__file__).resolve().parent.parent / "catalogue/research"
data = json.loads((research / "openfoodfacts-candidates.json").read_text())
products = {p["code"]: p for group in data.values() if isinstance(group, list) for p in group}
downloads = json.loads((research / "downloaded-candidates.json").read_text())
for code in ["8801043060226", "8801043053167", "0031146181018", "8801043014984", "8850987128301", "8850987101021", "4901734000037", "4901726015278", "6920152460061"]:
    product = products[code]
    target = research / "candidates" / (code + ".jpg")
    if target.exists():
        continue
    url = product["image_front_url"]
    if not url.startswith("https://images.openfoodfacts.org/images/products/"):
        raise ValueError("Unexpected image host")
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "KumoCatalogueResearch/1.0"}), timeout=15) as response:
            content = response.read()
        if not content.startswith(b"\xff\xd8"):
            raise ValueError("Not JPEG")
        target.write_bytes(content)
        product.update(local_path=str(target), bytes=len(content))
        downloads = [p for p in downloads if p["code"] != code] + [product]
        (research / "downloaded-candidates.json").write_text(json.dumps(downloads))
        print(code + ": downloaded", flush=True)
    except Exception as error:
        print(code + ": " + str(error), flush=True)
    time.sleep(1)

# Ocdp's Chicken Ramen photograph is explicitly CC0 on its Commons file page.
# Download is still a candidate: it is not mapped until visually checked.
commons_target = research / "candidates/nissin-chicken-ramen-cc0.jpg"
if not commons_target.exists():
    commons_url = "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Nissin_Chicken_Ramen_001.jpg/960px-Nissin_Chicken_Ramen_001.jpg"
    try:
        with urllib.request.urlopen(urllib.request.Request(commons_url, headers={"User-Agent": "KumoCatalogueResearch/1.0"}), timeout=15) as response:
            content = response.read()
        if not content.startswith(b"\xff\xd8"):
            raise ValueError("Not JPEG")
        commons_target.write_bytes(content)
        print("CC0 Chicken Ramen: downloaded candidate", flush=True)
    except Exception as error:
        print("CC0 Chicken Ramen: " + str(error), flush=True)
