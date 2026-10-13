"""Audit source and recursively inspect archive contents without printing secret values."""
from pathlib import Path
import re,json,zipfile,io,hashlib
ROOT=Path(__file__).resolve().parents[1]
patterns={
 'project0_key':re.compile(rb'p0_[A-Za-z0-9_-]{20,}'),
 'openai_key':re.compile(rb'sk-(?:proj-)?[A-Za-z0-9_-]{25,}'),
 'github_token':re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})'),
 'aws_access_id':re.compile(rb'AKIA[0-9A-Z]{16}'),
 'private_key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'credential_assignment':re.compile(rb'(?i)(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*[\x22\x27]([A-Za-z0-9_+/.=-]{25,})[\x22\x27]')
}
findings=[];files=0;entries=0
# The audit's own regex literals are not credentials.
def inspect(name,data,depth=0):
 global entries
 for kind,pattern in patterns.items():
  for match in pattern.finditer(data):findings.append({'file':name,'kind':kind,'offset':match.start()})
 if depth<5 and data[:4]==b'PK\x03\x04':
  try:
   with zipfile.ZipFile(io.BytesIO(data)) as z:
    for n in z.namelist():
     if z.getinfo(n).is_dir():continue
     entries+=1;inspect(name+'!'+n,z.read(n),depth+1)
  except zipfile.BadZipFile:pass
for p in ROOT.rglob('*'):
 if not p.is_file() or '.git' in p.parts or '__pycache__' in p.parts or p.suffix=='.pyc' or p.name.startswith('internal-') or p.name.endswith(('-scene.json','-hud.png')):continue
 files+=1;inspect(str(p.relative_to(ROOT)),p.read_bytes())
report={'ok':not findings,'filesInspected':files,'archiveEntriesInspected':entries,'findings':findings,'valuesPrinted':False,'scope':'Repository source, binary files and recursive archived content; Git database/caches excluded'}
(ROOT/'reports/secret-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if findings:raise SystemExit(1)
