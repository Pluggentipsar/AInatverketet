import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import samla_pilot as p


FIXTURE = '''<html><head><link rel="canonical" href="/ai/Test"></head><body>
<main><nav class="hiq-breadcrumbs"><a href="/ai">AI</a><a href="/ai/modeller">Modeller</a></nav>
<div class="pagecontent"><h1>Matematik</h1><p class="hiq-preamble">AI i undervisningen.</p>
<h2 id="ovning1">Övning 1. Diskutera</h2><p>Passar: Mellanstadiet och uppåt</p><p>Digitala verktyg: Nej</p>
<p>Eleverna diskuterar AI.</p><h2 id="ovning2">Övning 2. Undersök</h2><p>Passar: Högstadiet och gymnasiet</p>
<p>Tid: Cirka 2 lektioner</p><p>Digitala verktyg: Ja, eller färdiga exempel</p><p>Eleverna undersöker AI.</p>
<div class="plan__buttonrow"><p>Gymnasiet engelska</p><a href="/ai/nasta">Nästa</a></div>
</div><span class="hiq-page-info__item-date">9 sep 2026</span>
<div class="hiq-article-puffs"><h2>Relaterat: förskola svenska</h2><p>2027</p></div></main>
<footer>AI historia</footer><script>gymnasiet</script></body></html>'''


class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.page = p.extract(FIXTURE, "https://pedagog.jonkoping.se/ai/Test/")

    def test_only_article_content(self):
        self.assertEqual(self.page["titel"], "Matematik")
        self.assertNotIn("Relaterat", " ".join(self.page["rader"]))
        self.assertNotIn("Gymnasiet engelska", self.page["rader"])
        self.assertEqual(self.page["kallans_datum"], "9 sep 2026")
        self.assertEqual(self.page["brodsmulor"][-1]["titel"], "Modeller")

    def test_sections_do_not_inherit_sibling_or_package_requirements(self):
        rows = p.candidates(self.page, "2026-09-16")
        parent, one, two = rows
        self.assertEqual(parent["stadium"], [])
        self.assertEqual(parent["verktyg"], "okant")
        self.assertIsNone(parent["undervisningstid"])
        self.assertEqual(one["stadium"], ["46"])
        self.assertEqual(one["verktyg"], "utan")
        self.assertIsNone(one["undervisningstid"])
        self.assertEqual(two["stadium"], ["79", "gy"])
        self.assertEqual(two["verktyg"], "alternativ")
        self.assertEqual(two["undervisningstid"], "Tid: Cirka 2 lektioner")
        self.assertEqual(one["parent_id"], parent["id"])
        self.assertTrue(one["url"].endswith("#ovning1"))
        self.assertEqual(one["amne"], ["matematik"])

    def test_no_invented_anchor(self):
        self.page["avsnitt"][0]["ankare"] = None
        row = p.candidates(self.page, "now")[1]
        self.assertEqual(row["url"], row["sid_url"])
        self.assertIsNone(row["ankare"])

    def test_sitevision_button_heading_uses_real_portlet_anchor(self):
        html = '<main><div class="pagecontent"><h1>AI-vänner</h1><div class="sv-text-portlet"><div id="Ovning1"></div><button><h2>Övning 1. Fråga</h2></button><div><p>Passar: Mellanstadiet</p><p>Digitala verktyg: Nej</p></div></div></div></main>'
        page = p.extract(html, 'https://pedagog.jonkoping.se/ai/vanner')
        self.assertEqual(page['avsnitt'][0]['ankare'], 'Ovning1')

    def test_navigation_ai_does_not_establish_relevance(self):
        page = p.extract('<main><nav>AI i skolan</nav><div class="pagecontent"><h1>Skollunch</h1><p>Veckans mat.</p></div><footer>AI</footer></main>', "https://pedagog.jonkoping.se/nyhetslistning/lunch")
        self.assertEqual(p.classify(page)["urval"], "avvakta")

    def test_reading_time_not_lesson_time(self):
        page = p.extract('<main><h1>Lära om AI</h1><p>Lästid: 10 minuter</p><p>Introduktion om AI.</p></main>', "https://pedagog.jonkoping.se/ai/lara-om-ai")
        self.assertIsNone(p.classify(page)["undervisningstid"])

    def test_title_change_invalidates_approval(self):
        before = p.candidates(self.page, "now")[1]
        self.page["avsnitt"][0]["titel"] = "Ändrad rubrik"
        after = p.candidates(self.page, "later")[1]
        self.assertEqual(before["id"], after["id"])
        self.assertNotEqual(before["innehall_hash"], after["innehall_hash"])


class CrawlTests(unittest.TestCase):
    def test_normalization_preserves_case_and_verified_fragments(self):
        self.assertEqual(p.normalize("https://EXAMPLE.se/Case/#h-Test", fragment=True), "https://example.se/Case#h-Test")
        self.assertEqual(p.normalize("https://example.se/Case/#h-Test"), "https://example.se/Case")
        for bad in ["javascript:alert(1)", "https://user:secret@example.se/a", "https://example.se/a?state=keepAlive", "https://example.se/a;jsessionid=x"]:
            with self.assertRaises(ValueError): p.normalize(bad)

    def test_robots_wildcards_specific_groups_and_allow(self):
        robots = p.Robots("User-agent: *\nDisallow: /ai/private*\nAllow: /ai/private/open$\nDisallow: /*.printable$\nUser-agent: OtherBot\nDisallow: /\n")
        self.assertTrue(robots.allows("https://example.se/ai"))
        self.assertFalse(robots.allows("https://example.se/ai/private-a"))
        self.assertTrue(robots.allows("https://example.se/ai/private/open"))
        self.assertFalse(robots.allows("https://example.se/ai/private/open-more"))
        self.assertFalse(robots.allows("https://example.se/ai/a.html.printable"))
        specific = p.Robots("User-agent: *\nDisallow: /\nUser-agent: AINatverketPilot\nAllow: /ai\nCrawl-delay: 3\n")
        self.assertTrue(specific.allows("https://example.se/ai"))
        self.assertEqual(specific.delay, 3)

    def test_host_and_path_boundary(self):
        config = {"origin": "https://pedagog.jonkoping.se", "prefix": ["/ai"]}
        self.assertTrue(p.in_scope("https://pedagog.jonkoping.se/ai/x", config))
        for url in ["https://other.se/ai/x", "https://pedagog.jonkoping.se/airport", "https://pedagog.jonkoping.se/ai/x.pdf", "http://pedagog.jonkoping.se/ai/x"]:
            self.assertFalse(p.in_scope(url, config))


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.record = p.candidates(p.extract(FIXTURE, "https://pedagog.jonkoping.se/ai/Test"), "now")[1]
        self.decision = {"status": "godkand", "innehall_hash": self.record["innehall_hash"], "gransknings_hash": self.record["gransknings_hash"], "andringar": {"stadium": ["46", "79"]}, "notering": "Kontrollerat"}

    def test_repeated_crawl_preserves_editorial_values(self):
        decisions = {self.record["id"]: self.decision}
        result = p.reviewed(self.record, decisions)
        self.assertEqual(result["granskning"], "godkand")
        self.assertEqual(result["stadium"], ["46", "79"])
        self.assertEqual(self.record["stadium"], ["46"])
        changed = {**self.record, "innehall_hash": "new"}
        result = p.reviewed(changed, decisions)
        self.assertEqual(result["granskning"], "andrad")
        self.assertEqual(result["stadium"], ["46", "79"])
        self.assertEqual(result["redaktionella_falt"], ["stadium"])
        new_rules = {**self.record, "gransknings_hash": "new-rules"}
        self.assertEqual(p.reviewed(new_rules, decisions)["granskning"], "andrad")

    def test_import_validates_all_decisions_before_writes(self):
        doc = {"version": 1, "beslut": {self.record["id"]: self.decision}}
        self.assertEqual(p.validate_decisions(doc, [self.record]), doc)
        for bad in [{"stadium": ["alla"]}, {"url": "https://evil.example"}, {"anvandning": "med"}, {"verktyg": "utan-ai"}]:
            modified = copy.deepcopy(doc)
            modified["beslut"][self.record["id"]]["andringar"] = bad
            with self.assertRaises(ValueError): p.validate_decisions(modified, [self.record])
        self.decision["innehall_hash"] = "stale"
        with self.assertRaises(ValueError): p.validate_decisions(doc, [self.record])

    def test_publication_export_contains_only_current_approvals(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "site/prototyp").mkdir(parents=True)
            (root / "data/pilot").mkdir(parents=True)
            (root / "data/pilot/taxonomi.json").write_text((p.DATA / "taxonomi.json").read_text(encoding="utf-8"), encoding="utf-8")
            p.atomic_json(root / "data/pilot/granskning.json", {"beslut": {self.record["id"]: self.decision}})
            document = {"skapad": "now", "statistik": {}, "resurser": [self.record]}
            with patch.object(p, "ROOT", root), patch.object(p, "DATA", root / "data/pilot"):
                p.build_site(document)
                self.assertEqual(len(p.read_json(p.DATA / "godkanda.json")["resurser"]), 1)
                self.record["innehall_hash"] = "changed"
                p.build_site(document)
                self.assertEqual(p.read_json(p.DATA / "godkanda.json")["resurser"], [])
                self.assertTrue((root / "site/prototyp/pilot-data.js").exists())

    def test_failed_crawl_does_not_replace_existing_candidates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            root.mkdir(exist_ok=True)
            (root/'kandidater.json').write_text('existing candidates', encoding='utf-8')
            (root/'kalla.json').write_text('{}', encoding='utf-8')
            with patch.object(p, 'ROOT', root), patch.object(p, 'DATA', root), patch.object(p, 'crawl', return_value=([], [{'fel':'timeout'}])), patch('sys.argv', ['samla_pilot.py']):
                with self.assertRaises(SystemExit): p.main()
            self.assertEqual((root/'kandidater.json').read_text(encoding='utf-8'), 'existing candidates')


if __name__ == "__main__":
    unittest.main()
