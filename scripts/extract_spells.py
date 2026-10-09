import urllib.request
import re
import json

req = urllib.request.Request(
    'https://spellbook-cdd.ai.studio/assets/index-CT2JrQiR.js',
    headers={'User-Agent': 'Mozilla/5.0'}
)
with urllib.request.urlopen(req) as resp:
    content = resp.read().decode('utf-8', errors='ignore')

# Look for patterns like id:`...`,name:`...`
print("File length:", len(content))

# Let's count how many spells have id:`...`
matches = re.findall(r'id:`([^`]+)`,name:`([^`]+)`,nameEn:`([^`]+)`', content)
print(f"Found {len(matches)} spells via regex!")
for m in matches[:10]:
    print(m)
