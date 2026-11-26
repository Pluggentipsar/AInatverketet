"""Avgränsad Sitevision-pilot. Python 3.11+, bara standardbiblioteket.

Insamling och metadataförslag är åtskilda från redaktionella beslut.
Fulltext stannar i .cache; den vanliga katalogen ändras aldrig här.
"""
import argparse
from collections import deque
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
import unicodedata
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "pilot"
AGENT = "AINatverketPilot/0.1"
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
SKIP_TAGS = {"script", "style", "noscript", "nav", "footer", "header", "form"}
SKIP_CLASSES = {"plan__buttonrow", "hiq-back-button__decoration", "hiq-next-button__decoration",
                "hiq-article-puffs", "hiq-page-info", "hiq-related-information__wrapper"}


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def fold(text):
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(c))


def digest(text):
    return sha256(text.encode("utf-8")).hexdigest()


def normalize(url, base=None, fragment=False):
    p = urlsplit(urljoin(base or "", url))
    if p.scheme not in ("http", "https") or not p.hostname or p.username or p.password:
        raise ValueError("Ogiltig webbadress")
    if p.query or ";" in p.path or p.port not in (None, 80, 443):
        raise ValueError("Parametriserade adresser ingår inte i piloten")
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/") or "/", "", p.fragment if fragment else ""))


class Node:
    def __init__(self, tag="root", attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    def has(self, cls):
        return cls in self.attrs.get("class", "").split()

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()

    def text(self):
        if self.tag in SKIP_TAGS or any(self.has(c) for c in SKIP_CLASSES):
            return ""
        return clean(" ".join(c.text() if isinstance(c, Node) else c for c in self.children))


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node()
        self.feed(html)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        node = self.current
        while node.parent:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent

    def handle_data(self, text):
        self.current.children.append(text)


def excluded(node, boundary):
    while node is not boundary:
        if node.tag in SKIP_TAGS or any(node.has(c) for c in SKIP_CLASSES):
            return True
        node = node.parent
    return False


def extract(html, url):
    root = Tree(html).root
    nodes = list(root.walk())
    main = next((n for n in nodes if n.tag == "main"), None)
    if main is None:
        raise ValueError("Saknar huvudinnehåll; behöver annan källadapter")
    content = next((n for n in main.walk() if n.has("pagecontent")), main)
    usable = [n for n in content.walk() if not excluded(n, content)]
    title = next((n.text() for n in usable if n.tag == "h1"), "")
    if not title:
        raise ValueError("Saknar sidrubrik")
    intro = next((n.text() for n in usable if n.has("hiq-preamble")), "")
    blocks = [n for n in usable if n.tag in {"h1", "h2", "h3", "p", "li"} and n.text()]
    lines = [n.text() for n in blocks]
    canonical = next((n.attrs.get("href") for n in nodes if n.tag == "link" and n.attrs.get("rel") == "canonical"), url)
    canonical = normalize(canonical, url)
    # A source cannot canonicalize a record into another origin.
    if urlsplit(canonical).netloc != urlsplit(url).netloc:
        canonical = url
    crumbs = next((n for n in nodes if n.has("hiq-breadcrumbs")), None)
    parents = []
    if crumbs:
        for n in crumbs.walk():
            if n.tag == "a" and n.attrs.get("href"):
                try:
                    parents.append({"url": normalize(n.attrs["href"], url), "titel": n.text()})
                except ValueError:
                    pass
    links = []
    for n in main.walk():
        if n.tag == "a" and n.attrs.get("href"):
            try:
                links.append(normalize(n.attrs["href"], url))
            except ValueError:
                pass
    sections = []
    for i, n in enumerate(blocks):
        if n.tag == "h2" and re.match(r"Övning\s*\d", n.text(), re.I):
            end = next((j for j in range(i + 1, len(blocks)) if blocks[j].tag == "h2"), len(blocks))
            anchor = n.attrs.get("id")
            if not anchor:
                box = n
                while box is not content and not box.has("sv-text-portlet"):
                    box = box.parent
                if box is not content:
                    anchor = next((c.attrs["id"] for c in box.children if isinstance(c, Node) and c.attrs.get("id") and not c.attrs["id"].startswith("svid")), None)
            sections.append({"titel": n.text(), "ankare": anchor, "rader": lines[i:end], "sort": "ovning"})
    # Sitevision's expandable lesson cards use buttons, not headings.
    for n in usable:
        if n.has("hiq-expandable-box__decoration-title") and any("Kompletta lektionsupplägg" in line for line in lines):
            box = n.parent
            while box is not content and not box.has("sv-text-portlet"):
                box = box.parent
            body = next((c for c in box.walk() if c.has("hiq-expandable-box__decoration-content")), None)
            if body and re.search(r"prompt|lärarens roll|eleven", body.text(), re.I):
                anchor = next((c.attrs["id"] for c in box.children if isinstance(c, Node) and c.attrs.get("id") and not c.attrs["id"].startswith("svid")), None)
                section_lines = [c.text() for c in body.walk() if c.tag in {"p", "li", "h3"} and c.text()]
                sections.append({"titel": n.text(), "ankare": anchor, "rader": section_lines, "sort": "lektion"})
    date = next((n.text() for n in nodes if n.has("hiq-page-info__item-date")), None)
    return {"url": canonical, "titel": title, "ingress": intro, "rader": lines,
            "brodsmulor": parents, "kallans_datum": date, "avsnitt": sections,
            "lankar": list(dict.fromkeys(links)), "extraktion": "pagecontent" if content is not main else "main"}


class Robots:
    """Longest matching rule, wildcard and end anchor; specific UA groups win."""
    def __init__(self, text):
        groups, agents, rules = [], [], []
        for raw in text.splitlines() + ["User-agent: sentinel"]:
            line = raw.split("#", 1)[0].strip()
            if ":" not in line:
                continue
            key, value = (s.strip() for s in line.split(":", 1))
            if key.lower() == "user-agent":
                if rules:
                    groups.append((agents, rules))
                    agents, rules = [], []
                agents.append(value.lower())
            elif key.lower() in {"allow", "disallow", "crawl-delay"} and agents:
                rules.append((key.lower(), value))
        specific = [r for a, r in groups if any(v != "*" and v in AGENT.lower() for v in a)]
        self.rules = [r for group in (specific or [r for a, r in groups if "*" in a]) for r in group]

    def allows(self, url):
        path = urlsplit(url).path
        matches = []
        for kind, value in self.rules:
            if kind not in {"allow", "disallow"} or not value:
                continue
            pattern = re.escape(value).replace(r"\*", ".*")
            if value.endswith("$"):
                pattern = pattern[:-2] + "$"
            if re.match(pattern, path):
                matches.append((len(value.replace("*", "").rstrip("$")), kind == "allow"))
        return max(matches)[1] if matches else True

    @property
    def delay(self):
        return max([float(v) for k, v in self.rules if k == "crawl-delay" and re.fullmatch(r"\d+(\.\d+)?", v)] or [0])


def in_scope(url, config):
    p = urlsplit(url)
    return (f"{p.scheme}://{p.netloc}" == config["origin"] and not p.query
            and not re.search(r"\.(pdf|jpg|png|zip|xml|printable)$", p.path, re.I)
            and any(p.path == v or p.path.startswith(v + "/") for v in config["prefix"]))


class GuardRedirect(HTTPRedirectHandler):
    def __init__(self, allowed):
        self.allowed = allowed

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not self.allowed(newurl):
            raise ValueError("Omdirigering utanför tillåten källa/robots")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def read_json(path, default=None):
    return json.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else default


def classify(page, section=None):
    title = section["titel"] if section else page["titel"]
    lines = section["rader"] if section else page["rader"]
    # Never leak one exercise's requirements to a sibling or its package.
    own = "\n".join(lines) if section or not page["avsnitt"] else page["ingress"]
    text = fold(title + "\n" + own)
    context = fold(" ".join(c["titel"] for c in page["brodsmulor"]) + " " + page["titel"])
    evidence = []

    def proof(field, value, location, basis="regel", quote=None):
        evidence.append({"falt": field, "varde": value, "grund": basis, "plats": location, **({"utdrag": quote[:110]} if quote else {})})

    uses = []
    if "lara om ai" in context or re.search(r"kom igang|begreppslista", fold(title)):
        uses.append("forsta"); proof("anvandning", "forsta", "Rubrik / brödsmulor")
    if "lektionsmaterial" in context or re.search(r"ovning.*|undervisa om ai", fold(title)):
        uses.append("om"); proof("anvandning", "om", "Övningsrubrik / materialets sammanhang")
    if "klassrummet - lararhandledning" in context or re.search(r"prompt for eleven|eleven.*ai|eleverna.*ai", text):
        uses.append("med"); proof("anvandning", "med", "Sidans innehåll / lärarhandledning")
    if "arbetsrummet" in context or "tankemodell" in context:
        uses.append("planera"); proof("anvandning", "planera", "Brödsmulor: pedagogisk planering")
    subjects = []
    for value in read_json(DATA / "taxonomi.json")["amne"]:
        if fold(page["titel"]) == value:
            subjects.append(value); proof("amne", value, "Ämnessidans rubrik", "uttryckligt")
    stage = []
    # Only dedicated target-group statements, never incidental mentions in the body.
    stage_line = next((line for line in lines if re.match(r"(?:Passar|Målgrupp|Årskurs)\s*:", line, re.I)), "") if section or not page["avsnitt"] else ""
    target = fold(stage_line)
    for value, pattern in {"forskola": r"forskol", "f3": r"lagstad|f[–-]3|1[–-]3", "46": r"mellanstad|4[–-]6", "79": r"hogstad|7[–-]9", "gy": r"gymnas"}.items():
        if re.search(pattern, target):
            stage.append(value); proof("stadium", value, "Målgruppsrad", "uttryckligt", stage_line)
    if "mellanstadiet och uppat" in target:
        # 'Upwards' is an interpretation; do not silently tag every later stage.
        proof("stadium", "46", "”Och uppåt” behöver preciseras av redaktör", "regel")
    tool_line = next((l for l in lines if re.match(r"Digitala verktyg\s*:", l, re.I)), "") if section or not page["avsnitt"] else ""
    tool = "okant"
    if tool_line:
        t = fold(tool_line)
        tool = "utan" if re.search(r":\s*nej", t) else "alternativ" if "eller" in t else "digitalt" if re.search(r":\s*ja", t) else "okant"
        proof("verktyg", tool, "Verktygsrad", "uttryckligt", tool_line)
    elif re.search(r"prompt for eleven|eleven ber ai|eleven.*konversation med ai", text):
        tool = "elever"; proof("verktyg", tool, "Instruktion till eleven", "regel")
    if tool == "utan":
        uses = [u for u in uses if u != "med"]
        evidence = [p for p in evidence if not (p["falt"] == "anvandning" and p["varde"] == "med")]
    duration = next((l for l in lines if re.match(r"Tid\s*:", l, re.I)), None) if section or not page["avsnitt"] else None
    if duration:
        proof("undervisningstid", duration, "Tidsrad", "uttryckligt", duration)
    kind = section["sort"] if section else "annat"
    if not section:
        if page["avsnitt"] or fold(title) in {"ai - fran forskola till gymnasium", "pedagogiska tankemodeller", "lektionsingangar for ditt amne", "lektionsmaterial ai", "ai-tipset", "lankar ai"}:
            kind = "samling"
        elif "tankemodeller" in context:
            kind = "metod"
        elif "/bloggarkiv/" in page["url"] or "/nyhetsarkiv/" in page["url"]:
            kind = "reflektion"
        elif "/ai/" in page["url"]:
            kind = "introduktion"
    proof("materialtyp", kind, "Avsnittsstruktur" if section else "Rubrik och sidstruktur")
    relevant = bool(re.search(r"\bai\b|artificiell intelligens|chatgpt|chatbot", text)) or bool(section and re.search(r"\bai\b", context))
    listing = urlsplit(page["url"]).path in {"/nyhetslistning", "/blogglistning"}
    return {"anvandning": list(dict.fromkeys(uses)), "amne": subjects, "stadium": stage,
            "verktyg": tool, "undervisningstid": duration, "materialtyp": kind, "belagg": evidence,
            "urval": "foreslagen" if relevant and not listing else "avvakta",
            "urvalsskal": "Nyhets-/bloggflöde, ingen enskild resurs. Används bara för att upptäcka länkar." if listing else "AI förekommer i huvudinnehållet; pedagogisk relevans behöver granskas." if relevant else "Ingen tydlig AI-koppling i huvudinnehållet. Föreslås inte till katalogen."}


def candidates(page, fetched_at):
    parent_id = "jkp-" + digest(page["url"])[:12]
    result = []
    for section in [None] + page["avsnitt"]:
        title = section["titel"] if section else page["titel"]
        anchor = section.get("ankare") if section else None
        identity = anchor or title if section else ""
        url = page["url"] + ("#" + anchor if anchor else "")
        classification = classify(page, section)
        # Own template description, not copied full text or a claimed AI summary.
        kind_label = read_json(DATA / "taxonomi.json")["materialtyp"][classification["materialtyp"]].lower()
        description = f"{kind_label.capitalize()} från Pedagog Jönköping"
        description += f", i materialet {page['titel']}." if section else "."
        description += " Öppna originalet för instruktioner och sammanhang."
        content = title + "\n" + page["titel"] + "\n" + "\n".join(section["rader"] if section else page["rader"])
        result.append({"id": parent_id + ("-" + digest(identity)[:8] if section else ""),
                       "kalla_id": "pedagog-jonkoping", "kalla_namn": "Pedagog Jönköping", "titel": title,
                       "url": url, "sid_url": page["url"], "parent_id": parent_id if section else None,
                       "parent_titel": page["titel"] if section else None,
                       "overordnad_url": page["brodsmulor"][-1]["url"] if page["brodsmulor"] else None,
                       "niva": "avsnitt" if section else "sida", "ankare": anchor,
                       "beskrivning": description, "format": "webbsida", "hamtad": fetched_at,
                       "kallans_datum": page["kallans_datum"], "innehall_hash": digest(content),
                       "extraktion": page["extraktion"], **classification})
    drafts = read_json(DATA / "beskrivningar.json", {})
    for record in result:
        draft = drafts.get(record["id"])
        record["beskrivning_grund"] = "mall"
        if draft and draft["innehall_hash"] == record["innehall_hash"]:
            record["beskrivning"] = draft["text"]
            record["beskrivning_grund"] = "skrivet_pilotutkast"
        # A changed classifier or description also requires a new editorial check.
        record["gransknings_hash"] = digest(json.dumps({k: v for k, v in record.items() if k not in {"hamtad", "kallans_datum"}}, ensure_ascii=False, sort_keys=True))
    return result


def crawl(config, offline=False, refresh=False):
    cache = ROOT / ".cache" / "jonkoping"
    cache.mkdir(parents=True, exist_ok=True)
    robot_path = cache / "robots.txt"
    if not offline:
        # Robots redirects may remain on this origin only; failure stops the run.
        opener = build_opener(GuardRedirect(lambda u: u == config["origin"] + "/robots.txt"))
        with opener.open(Request(config["origin"] + "/robots.txt", headers={"User-Agent": AGENT}), timeout=25) as r:
            robot_path.write_text(r.read(256_000).decode("utf-8"), encoding="utf-8")
    robots = Robots(robot_path.read_text(encoding="utf-8"))
    allowed = lambda u: in_scope(normalize(u), config) and robots.allows(u)
    opener = build_opener(GuardRedirect(allowed))
    queue = deque((normalize(p, config["origin"]), "start") for p in config["start"])
    seen, canonical_seen, pages, issues = set(), set(), [], []
    last_request = time.monotonic()
    while queue and len(seen) < config["max_sidor"]:
        url, discovered = queue.popleft()
        if url in seen or not in_scope(url, config):
            continue
        seen.add(url)
        if not robots.allows(url):
            issues.append({"url": url, "typ": "robots", "fel": "Tillåts inte av robots.txt"}); continue
        key = digest(url)
        html_path, meta_path = cache / (key + ".html"), cache / (key + ".json")
        try:
            meta = read_json(meta_path)
            if not html_path.exists() or (refresh and not offline):
                if offline:
                    raise ValueError("Sidan saknas i lokal cache")
                time.sleep(max(0, max(config["paus_sekunder"], robots.delay) - (time.monotonic() - last_request)))
                headers = {"User-Agent": AGENT, "Accept": "text/html"}
                if meta:
                    if meta.get("etag"): headers["If-None-Match"] = meta["etag"]
                    if meta.get("last_modified"): headers["If-Modified-Since"] = meta["last_modified"]
                try:
                    last_request = time.monotonic()
                    with opener.open(Request(url, headers=headers), timeout=25) as response:
                        if "text/html" not in response.headers.get("Content-Type", ""):
                            raise ValueError("Innehållet är inte HTML")
                        raw = response.read(2_000_001)
                        if len(raw) > 2_000_000: raise ValueError("Sidan överskrider 2 MB")
                        html = raw.decode(response.headers.get_content_charset() or "utf-8")
                        meta = {"hamtad": datetime.now(timezone.utc).isoformat(), "slutlig_url": normalize(response.url),
                                "etag": response.headers.get("ETag"), "last_modified": response.headers.get("Last-Modified"), "http": response.status}
                        html_path.write_text(html, encoding="utf-8")
                        atomic_json(meta_path, meta)
                except HTTPError as error:
                    if error.code != 304 or not html_path.exists(): raise
            if not meta:
                raise ValueError("Cache saknar hämtmetadata")
            page = extract(html_path.read_text(encoding="utf-8"), meta["slutlig_url"])
            if not in_scope(page["url"], config): raise ValueError("Canonical utanför tillåtet område")
            for link in page["lankar"]:
                if link not in seen and in_scope(link, config): queue.append((link, url))
            if page["url"] in canonical_seen: continue
            canonical_seen.add(page["url"])
            page.update({"hamtad": meta["hamtad"], "hamtad_url": url, "upptackt_via": discovered})
            pages.append(page)
            print(f"{len(pages):2}. {page['titel']} ({len(page['avsnitt'])} avsnitt)", flush=True)
        except (ValueError, OSError) as error:
            issues.append({"url": url, "typ": "hamtningsfel", "fel": str(error)[:200]})
            print(f"Kunde inte läsa: {url}: {error}", flush=True)
    return pages, issues


def validate_decisions(document, records):
    if not isinstance(document, dict) or document.get("version") != 1 or not isinstance(document.get("beslut"), dict):
        raise ValueError("Granskningsfilen måste ha version 1 och objektet beslut")
    lookup = {r["id"]: r for r in records}
    taxonomy = read_json(DATA / "taxonomi.json")
    for key, decision in document["beslut"].items():
        if key not in lookup: raise ValueError(f"Okänd resurs: {key}")
        if not isinstance(decision, dict): raise ValueError(f"Ogiltigt beslutsobjekt: {key}")
        if decision.get("status") not in {"godkand", "avvisad", "granska"}: raise ValueError("Ogiltigt beslut")
        if decision.get("innehall_hash") != lookup[key]["innehall_hash"]: raise ValueError(f"Innehållet har ändrats: {key}")
        if decision.get("gransknings_hash") != lookup[key]["gransknings_hash"]: raise ValueError(f"Kategoriförslaget har ändrats: {key}")
        if not isinstance(decision.get("notering", ""), str) or len(decision.get("notering", "")) > 2000: raise ValueError("Ogiltig notering")
        edits = decision.get("andringar", {})
        if not isinstance(edits, dict): raise ValueError("Ändringar ska vara ett objekt")
        for field, value in edits.items():
            if field in {"anvandning", "amne", "stadium"}:
                if not isinstance(value, list) or any(not isinstance(v, str) for v in value) or len(set(value)) != len(value) or any(v not in taxonomy[field] for v in value): raise ValueError(f"Ogiltigt {field}")
            elif field in {"materialtyp", "verktyg"}:
                if not isinstance(value, str) or value not in taxonomy[field]: raise ValueError(f"Ogiltigt {field}")
            elif field == "beskrivning":
                if not isinstance(value, str) or not 20 <= len(value) <= 500: raise ValueError("Beskrivning ska vara 20–500 tecken")
            else: raise ValueError(f"Fält får inte ändras: {field}")
    return document


def reviewed(record, decisions):
    result = dict(record)
    decision = decisions.get(record["id"])
    result["granskning"] = "ej_granskad"
    if decision:
        result["granskning"] = decision["status"] if decision["innehall_hash"] == record["innehall_hash"] and decision.get("gransknings_hash") == record["gransknings_hash"] else "andrad"
        # Preserve editorial edits and their provenance, including on changed pages.
        result.update(decision.get("andringar", {}))
        result["redaktionella_falt"] = list(decision.get("andringar", {}))
    return result


def build_site(document):
    decisions = read_json(DATA / "granskning.json", {"version": 1, "beslut": {}})["beslut"]
    records = [reviewed(r, decisions) for r in document["resurser"]]
    public = {"version": 1, "skapad": document["skapad"], "taxonomi": read_json(DATA / "taxonomi.json"),
              "statistik": document["statistik"], "resurser": records}
    # The public pilot deliberately previews unreviewed metadata, visibly labelled.
    # Separate export for a future production consumer, approved records only.
    atomic_json(DATA / "godkanda.json", {"resurser": [r for r in records if r["granskning"] == "godkand"]})
    path = ROOT / "site" / "prototyp" / "pilot-data.js"
    path.write_text("// Genererad av scripts/samla_pilot.py. Endast metadata.\nwindow.AINAT_PILOT = " + json.dumps(public, ensure_ascii=False).replace("<", "\\u003c") + ";\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Bygg om från hämtad cache utan nätverk")
    parser.add_argument("--refresh", action="store_true", help="Kontrollera tidigare hämtade sidor med ETag/Last-Modified")
    parser.add_argument("--build", action="store_true", help="Bygg enbart webbdata från kandidater och beslut")
    parser.add_argument("--import-review", type=Path, help="Validera och slå ihop exporterade redaktörsbeslut")
    args = parser.parse_args()
    if args.build or args.import_review:
        document = read_json(DATA / "kandidater.json")
        if args.import_review:
            incoming = validate_decisions(read_json(args.import_review), document["resurser"])
            existing = read_json(DATA / "granskning.json", {"version": 1, "beslut": {}})
            existing["beslut"].update(incoming["beslut"])
            atomic_json(DATA / "granskning.json", existing)
        build_site(document)
        return
    pages, issues = crawl(read_json(DATA / "kalla.json"), args.offline, args.refresh)
    if not pages or issues:
        # Partial runs are diagnostics, not permission to erase known candidates.
        atomic_json(ROOT / ".cache" / "jonkoping" / "fel.json", issues)
        raise SystemExit(f"Ofullständig körning ({len(pages)} sidor, {len(issues)} fel). Tidigare data bevaras. Se .cache/jonkoping/fel.json")
    records = [r for page in pages for r in candidates(page, page["hamtad"])]
    if len({r["id"] for r in records}) != len(records): raise SystemExit("Dubbla identifierare; ingen data skrevs")
    document = {"version": 1, "skapad": datetime.now(timezone.utc).isoformat(),
                "statistik": {"sidor": len(pages), "avsnitt": len(records) - len(pages), "kandidater": len(records)},
                "sidor": [{k: p[k] for k in ("url", "hamtad_url", "upptackt_via", "hamtad", "extraktion")} for p in pages],
                "resurser": records}
    atomic_json(DATA / "kandidater.json", document)
    build_site(document)
    print(json.dumps(document["statistik"], ensure_ascii=False))


if __name__ == "__main__":
    main()
