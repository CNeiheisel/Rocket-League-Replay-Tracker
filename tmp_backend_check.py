import urllib.request
urls = ['http://localhost:5000/api/ballchasing/matches?limit=5', 'http://localhost:5000/api/players']
for url in urls:
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            body = r.read().decode('utf-8', errors='replace')
            print('URL:', url)
            print('STATUS:', r.status)
            print('BODY:', body[:1000])
            print('---')
    except Exception as e:
        print('URL:', url)
        print('ERROR:', e)
        print('---')
