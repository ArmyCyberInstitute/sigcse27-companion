"""Check teaching links and YouTube metadata; preserve restricted results as unverified."""
import argparse,html,json,re,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlsplit,parse_qs,urlencode
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
def inventory(root):
    found={}
    files=list((root/'snapshots').rglob('*.qmd'))+list((root/'snapshots').glob('*/assets/labs/**/*.html'))
    files+=list((root/'demos/ethereum_lab/frontend/src').rglob('*.jsx'))
    for p in files:
        text=re.sub(r'<!--.*?-->',lambda match:'\n'*match[0].count('\n'),p.read_text(errors='replace'),flags=re.S)
        for line_number,line in enumerate(text.splitlines(),1):
            urls=re.findall(r'(?:href=["\']|\]\()(https?://[^"\'\s)]+)',line)
            urls+=re.findall(r'https?://(?:www\.)?(?:youtube\.com|youtu\.be)/[^\s<>"\'`\)\]}]+',line)
            for url in set(urls):
                url=html.unescape(url.rstrip('.,;:'))
                if (urlsplit(url).hostname or '').endswith(('example.edu','example.com','example.org')):continue
                found.setdefault(url,[]).append({'file':str(p.relative_to(root)),'line':line_number})
    return found

def probe(url,locations):
    result={'url':url,'locations':locations};parts=urlsplit(url)
    video=None
    if parts.hostname and ('youtube.com' in parts.hostname or 'youtu.be' in parts.hostname):
        video=parts.path.split('/embed/')[-1] if '/embed/' in parts.path else parts.path.lstrip('/') if parts.hostname=='youtu.be' else parse_qs(parts.query).get('v',[''])[0]
        if video=='VIDEO_ID':return {**result,'status':'source-comment-placeholder'}
    request_url='https://www.youtube.com/oembed?'+urlencode({'url':'https://www.youtube.com/watch?v='+video,'format':'json'}) if video else url
    try:
        req=urllib.request.Request(request_url,headers={'User-Agent':'Mozilla/5.0 (compatible; curriculum-link-review)'})
        with urllib.request.urlopen(req,timeout=20) as response:
            result.update(status='metadata-available' if video else 'reachable',http_status=response.status,final_url=response.url,content_type=response.headers.get('Content-Type',''))
            if video:result['title']=json.load(response).get('title')
            elif '.pdf' in parts.path.lower() and 'html' in result['content_type']:result['status']='html-instead-of-pdf'
    except urllib.error.HTTPError as error:result.update(status='missing' if error.code in (404,410) else 'restricted-or-transient',http_status=error.code)
    except Exception as error:result.update(status='unverified',error=str(error))
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=Path('/tmp/companion-external-links.json'));args=parser.parse_args()
    targets=json.loads((ROOT/'web/external-link-targets.json').read_text());urls=inventory(ROOT)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results=list(pool.map(lambda item:probe(*item),urls.items()))
        replacements=list(pool.map(lambda item:probe(item[1],[{'replaces':item[0]}]),targets.items()))
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps({'links':results,'rendered_replacements':replacements},indent=2)+'\n')
    counts={}
    for result in results:counts[result['status']]=counts.get(result['status'],0)+1
    print(json.dumps({'counts':counts,'report':str(args.output)}))
if __name__=='__main__':main()
