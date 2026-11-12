import json,sys
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from check_external_links import inventory,probe

def test_examples_are_not_remote_availability_checks(tmp_path):
    p=tmp_path/'snapshots/final/lessons/example.qmd';p.parent.mkdir(parents=True)
    p.write_text('<!-- [Hidden](https://hidden.example.net/paper) -->\n[Example](https://course.example.edu/lab)\n[Primary](https://www.nist.gov/example)\n<iframe src="https://www.youtube.com/embed/ID123?start=4&amp;end=8"></iframe>')
    found=inventory(tmp_path)
    assert 'https://hidden.example.net/paper' not in found
    assert 'https://course.example.edu/lab' not in found
    assert 'https://www.nist.gov/example' in found
    assert 'https://www.youtube.com/embed/ID123?start=4&end=8' in found

def test_placeholder_media_does_not_make_a_network_request():
    assert probe('https://www.youtube.com/embed/VIDEO_ID',[])['status']=='source-comment-placeholder'

def test_replacements_are_used_by_preserved_source_and_point_to_https():
    targets=json.loads((ROOT/'web/external-link-targets.json').read_text())
    sources=inventory(ROOT)
    assert set(targets).issubset(sources)
    for old,new in targets.items():
        assert old!=new
        assert urlsplit(new).scheme=='https'
        assert urlsplit(new).hostname
