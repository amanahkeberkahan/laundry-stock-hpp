"""Read bank statements and compare transaction amounts with the prepared import."""
import argparse
import collections
import json
import re
from pathlib import Path
from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument('bri')
parser.add_argument('bsi')
parser.add_argument('--data', default='outputs/finance-import.json')
args = parser.parse_args()
data = json.loads(Path(args.data).read_text(encoding='utf-8'))
for bank, path in [('BRI', args.bri), ('BSI', args.bsi)]:
    rows = []
    for page in PdfReader(path).pages:
        text = page.extract_text()
        date_pattern = r'(\d{2})/(\d{2})/(\d{2}) \d{2}:\d{2}:\d{2}' if bank == 'BRI' else r'(\d{2}) Agu (\d{4})\s+\d{2}:\d{2}'
        starts = list(re.finditer(date_pattern, text))
        for i, match in enumerate(starts):
            block = text[match.end():starts[i+1].start() if i+1 < len(starts) else len(text)]
            pattern = r'(?<![\d.,])\d+(?:,\d{3})*\.\d{2}(?!\d)' if bank == 'BRI' else r'(?<![\d.,])\d+(?:\.\d{3})*,\d{2}(?!\d)'
            amounts = re.findall(pattern, block)
            if len(amounts) < 3:
                raise ValueError(f'{bank}: incomplete row {match.group(0)}')
            def number(s):
                return round(float(s.replace(',', '')) if bank == 'BRI' else float(s.replace('.', '').replace(',', '.')), 2)
            date = f'20{match[3]}-{match[2]}-{match[1]}' if bank == 'BRI' else f'{match[2]}-08-{match[1]}'
            rows.append((date, *map(number, amounts[:3])))
    expected = [(t['date'], round(t['debit'],2), round(t['credit'],2), round(t['balance'],2))
                for t in data['transactions'] if t['bank']==bank and t['bankPeriod']=='2026-08']
    if collections.Counter(rows) != collections.Counter(expected):
        raise ValueError(f'{bank}: PDF/import mismatch. PDF {len(rows)} rows vs import {len(expected)} rows.')
    print(f'PASS {bank}: {len(rows)} August transactions match date, debit, credit, and running balance (including duplicate rows).')
