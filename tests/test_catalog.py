"""Curated relationships must resolve to real artifacts with honest availability."""
import json
from pathlib import Path
import pytest
R = Path(__file__).resolve().parents[1]
CATALOG = json.loads((R / 'web/catalog.json').read_text())

@pytest.mark.parametrize('thread', CATALOG['threads'], ids=lambda t: t['id'])
def test_thread_sources_and_stage_availability(thread):
    assert set(thread['lessons']) == {s['id'] for s in CATALOG['stages']}
    assert thread['lessons']['early-work'] and thread['lessons']['final']
    for artifacts in thread['lessons'].values():
        for artifact in artifacts:
            assert (R / artifact['source']).is_file()
    for family in thread['microlabs'].values():
        assert not family['versions']['early-work']
        assert family['versions']['pilot'] and family['versions']['final']
        assert not family['versions']['pre-group-review']
        assert family['versions']['pilot'][0]['also_in']==['pre-group-review']
        for artifacts in family['versions'].values():
            for artifact in artifacts:
                assert (R / artifact['source']).is_file()
    for lab in thread['labs']:
        assert (R / CATALOG['labs'][lab]['guide']).is_file()

def test_overlap_and_related_endpoints_are_represented():
    by_id = {t['id']: t for t in CATALOG['threads']}
    assert len(by_id['hashing']['lessons']['early-work']) == 3
    assert len(by_id['consensus']['lessons']['final']) == 3
    assert by_id['hashing']['lessons']['early-work'][1]['source'] == by_id['signatures']['lessons']['early-work'][0]['source']

def test_only_changed_microlabs_are_compared():
    families={key:family for thread in CATALOG['threads'] for key,family in thread['microlabs'].items()}
    assert set(families)=={'merkle','signatures'}
    for family in families.values():
        digests=[a['comparison_digest'] for items in family['versions'].values() for a in items]
        assert len(digests)==len(set(digests))==2

def test_beamer_pairs_and_templates_resolve():
    for thread in CATALOG['threads']:
        if thread['id']=='trust':
            assert 'source_pair' not in thread
            continue
        pair=thread['source_pair']
        early=next(a for a in thread['lessons']['early-work'] if a['id']==pair['early-work'])
        final=next(a for a in thread['lessons']['final'] if a['id']==pair['final'])
        assert early['format']=='Beamer' and final['format']=='Quarto'
        assert len([p for p in early['source_files'] if p.endswith('.sty')])==4
        for source in early['source_files']:assert (R/source).is_file()

@pytest.mark.parametrize('activity', CATALOG['additional_microlabs'], ids=lambda a: a['id'])
def test_additional_microlabs_preserve_distinct_versions_and_group_duplicates(activity):
    versions = activity['versions']
    assert set(versions) == {stage['id'] for stage in CATALOG['stages']}
    assert not versions['early-work'] and not versions['pre-group-review']
    pilot, final = versions['pilot'][0], versions['final'][0]
    assert pilot['comparison_digest'] != final['comparison_digest']
    assert pilot['also_in'] == ['pre-group-review']
    assert len(pilot['equivalent_sources']) == 1
    assert (R / pilot['source']).read_bytes() == (R / pilot['equivalent_sources'][0]).read_bytes()
    assert (R / final['source']).is_file()
