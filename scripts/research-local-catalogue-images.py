"""Public image research only. No database access and no automatic storefront mappings."""
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
folder = root / "catalogue/research/local-candidates"
folder.mkdir(parents=True, exist_ok=True)
headers = {"User-Agent": "KumoCataloguePhotoReview/1.0"}

def fetch_json(parameters):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"format": "json", **parameters})
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
        return json.load(response)

titles = ["File:Jin Ramen (mild) 20210731 001.jpg", "File:Jin Ramen (spicy) 20210731 001.jpg", "File:2016 Indomie Mi Goreng Rendang NL 01.jpg", "File:Nissin Cup Noodle (Seafood) - 01.jpg"]
for category in ["Category:Nissin Cup Noodle (Curry)", "Category:Nissin Cup Noodle (Original)"]:
    try:
        result = fetch_json(dict(action="query", list="categorymembers", cmtitle=category, cmtype="file", cmlimit=30))
        matches = [p["title"] for p in result.get("query", {}).get("categorymembers", []) if p["title"].lower().endswith(".jpg") and not re.search("logo|inside|uncooked|noodles in|empty|contents", p["title"], re.I)]
        titles.extend(matches[:3])
    except Exception as error:
        print(category + ": " + str(error), flush=True)

records = []
for title in titles:
    try:
        result = fetch_json(dict(action="query", titles=title, prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=600))
        page = next(iter(result["query"]["pages"].values()))
        info = page["imageinfo"][0]
        metadata = info["extmetadata"]
        license_name = metadata.get("LicenseShortName", {}).get("value", "")
        if license_name not in ["CC BY-SA 4.0", "CC BY-SA 3.0", "CC BY 4.0", "CC0"]:
            print(title + ": licence requires manual review: " + license_name, flush=True)
            continue
        url = info.get("thumburl", info["url"])
        name = re.sub("[^a-z0-9]+", "-", title.lower()).strip("-") + ".jpg"
        target = folder / name
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
            content = response.read()
        if not content.startswith(b"\xff\xd8"):
            raise ValueError("Not JPEG")
        target.write_bytes(content)
        record = dict(title=title, source_url=info["descriptionurl"], source_image_url=url, license=license_name, license_url=metadata.get("LicenseUrl", {}).get("value", ""), author=html.unescape(re.sub("<[^>]*>", "", metadata.get("Artist", {}).get("value", ""))), local_path=str(target))
        records.append(record)
        print(title + ": licensed candidate saved; visual verification pending", flush=True)
    except Exception as error:
        print(title + ": " + str(error), flush=True)
    (folder / "sources.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
