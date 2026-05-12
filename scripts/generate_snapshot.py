import json
import os
import io
import csv
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from datetime import datetime, date, timedelta

# Auth
creds_json = os.environ['GOOGLE_SERVICE_ACCOUNT_KEY']
creds_dict = json.loads(creds_json)
creds = Credentials.from_service_account_info(
    creds_dict,
    scopes=[
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ]
)

drive = build('drive', 'v3', credentials=creds)

SHEET_ID = '16gycwzxACC2--gNuWpGeN0kcjtXUGv1d'

# Export the xlsx as CSV (first sheet)
request = drive.files().export_media(
    fileId=SHEET_ID,
    mimeType='text/csv'
)
fh = io.BytesIO()
downloader = MediaIoBaseDownload(fh, request)
done = False
while not done:
    _, done = downloader.next_chunk()

fh.seek(0)
content = fh.read().decode('utf-8')
rows = list(csv.reader(io.StringIO(content)))

today = date.today()

def parse_date(s):
    if not s or s.strip() in ['', '#VALUE!', 'N/A', 'not stated in website']:
        return None
    s = s.strip()
    for fmt in ['%m/%d/%Y', '%m/%d/%y', '%m-%d-%Y', '%m-%d-%y']:
        try:
            d = datetime.strptime(s, fmt)
            if d.year > 2027:
                return None
            return d.date()
        except:
            pass
    return None

def booking_target(ldos):
    return ldos - timedelta(days=28) if ldos else None

def yn(val):
    return str(val).strip().lower() in ['y', 'yes', 'true', '1'] if val else False

def is_overdue(booked, completed, bt):
    if completed or booked or not bt:
        return False
    return today > bt

def needs_nudge(booked, completed, outreach, last_outreach):
    if completed or booked or not outreach or not last_outreach:
        return False
    return (today - last_outreach).days >= 3

def get_status(completed, tier_num, overdue, booked, nudge):
    if completed: return 'completed'
    if tier_num == 3: return 't3-async'
    if overdue: return 'overdue'
    if booked: return 'booked'
    if nudge: return 'nudge'
    return 'schedule-soon'

# Find header row
header_idx = None
for i, row in enumerate(rows):
    if row and row[0] == 'District Name' and len(row) > 5:
        header_idx = i
        break

if header_idx is None:
    raise Exception("Could not find header row")

# Parse district rows
data_rows = []
for row in rows[header_idx + 1:]:
    if not row or not row[0].strip():
        continue
    first = row[0].strip()
    if any(x in first for x in ["Monica", "Daisy", "How to Use", "BTS Training"]):
        break
    data_rows.append(row)

# Parse tier assignments
tier_data = {}
tiers_start = None
for i, row in enumerate(rows):
    if row and 'BTS Tiers' in str(row[0]):
        tiers_start = i
        break

if tiers_start:
    for row in rows[tiers_start + 2:]:
        if not row or not row[0].strip():
            continue
        if len(row) < 7:
            continue
        name = row[0].strip()
        csm = row[2].strip() if len(row) > 2 else ''
        cohort = row[6].strip() if len(row) > 6 else ''
        tier_num = 1 if 'Cohort 1' in cohort else (2 if 'Cohort 2' in cohort else 3)
        if name:
            tier_data[name.lower()] = {'csm': csm, 'tierNum': tier_num}

def get_tier_info(name):
    key = name.lower()
    if key in tier_data:
        return tier_data[key]
    for k, v in tier_data.items():
        if k in key or key in k:
            return v
    return {'csm': None, 'tierNum': 3}

csm_map = {
    'Brianna Masciel': 'brianna',
    'Sarah Hough': 'sarah',
    'Monica Knott': 'monica',
    'Daisy Leahy': 'daisy',
}

districts = []
for row in data_rows:
    while len(row) < 18:
        row.append('')

    name = row[0].strip()
    if not name:
        continue

    owner = row[1].strip()
    ldos = parse_date(row[4])
    bt = booking_target(ldos)
    booked_raw = row[6].strip()
    is_async = 'async' in booked_raw.lower() or 'async' in row[7].lower()
    booked = yn(booked_raw) and not is_async
    outreach = yn(row[8])
    last_outreach = parse_date(row[9])
    completed = yn(row[10])

    tier_info = get_tier_info(name)
    tier_num = tier_info['tierNum']
    csm_name = tier_info['csm'] or owner
    csm_slug = csm_map.get(csm_name, csm_map.get(owner))
    if not csm_slug:
        continue

    overdue = is_overdue(booked, completed, bt)
    nudge = needs_nudge(booked, completed, outreach, last_outreach)
    status = get_status(completed, tier_num, overdue, booked, nudge)

    districts.append({
        'name': name,
        'shortName': name.replace(' Unified School District', '').replace(' School District', '').replace(' Independent School District', '').strip(),
        'owner': owner,
        'csm': csm_slug,
        'csmName': csm_name,
        'tier': f'Tier {tier_num}',
        'tierNum': tier_num,
        'lastDayOfSchool': ldos.isoformat() if ldos else None,
        'bookingTarget': bt.isoformat() if bt else None,
        'booked': booked,
        'meetingDate': parse_date(row[7]).isoformat() if parse_date(row[7]) else None,
        'outreachSent': outreach,
        'lastOutreachSentDate': last_outreach.isoformat() if last_outreach else None,
        'completed': completed,
        'notes': row[17],
        'status': status,
        'overdue': overdue,
        'needsNudge': nudge,
        'isUpsellCandidate': False,
        'utilization': None,
    })

csm_slugs = ['brianna', 'sarah', 'monica', 'daisy']
csm_data = {}

for slug in csm_slugs:
    csm_districts = [d for d in districts if d['csm'] == slug]
    t1t2 = [d for d in csm_districts if d['tierNum'] <= 2]
    unbooked = [d for d in t1t2 if not d['booked'] and not d['completed']]

    csm_data[slug] = {
        'districts': csm_districts,
        'stats': {
            'total': len(csm_districts),
            'tier1': len([d for d in csm_districts if d['tierNum'] == 1]),
            'tier2': len([d for d in csm_districts if d['tierNum'] == 2]),
            'tier3': len([d for d in csm_districts if d['tierNum'] == 3]),
            'booked': len([d for d in t1t2 if d['booked']]),
            'completed': len([d for d in csm_districts if d['completed']]),
            'overdue': len([d for d in t1t2 if d['overdue']]),
            'nudgeReady': len([d for d in t1t2 if d['needsNudge']]),
            'unbooked': len(unbooked),
        },
        'gapToGoal': {
            'totalNeedingCall': len(t1t2),
            'booked': len([d for d in t1t2 if d['booked']]),
            'completed': len([d for d in csm_districts if d['completed']]),
            'unbooked': len(unbooked),
            'weeklyTarget': max(1, len(unbooked) // 3) if unbooked else 0,
            'thisWeekUrgent': len([d for d in unbooked if d.get('bookingTarget') and (date.fromisoformat(d['bookingTarget']) - today).days <= 7]),
        }
    }

all_t1t2 = [d for d in districts if d['tierNum'] <= 2]
portfolio_unbooked = [d for d in all_t1t2 if not d['booked'] and not d['completed']]

snapshot = {
    'refreshedAt': datetime.utcnow().isoformat() + 'Z',
    'stale': False,
    'portfolio': {
        'totalDistricts': len(districts),
        'overdue': len([d for d in all_t1t2 if d['overdue']]),
        'nudgeReady': len([d for d in all_t1t2 if d['needsNudge']]),
        'gapToGoal': {
            'totalNeedingCall': len(all_t1t2),
            'booked': len([d for d in all_t1t2 if d['booked']]),
            'completed': len([d for d in districts if d['completed']]),
            'unbooked': len(portfolio_unbooked),
            'weeklyTarget': max(1, len(portfolio_unbooked) // 3) if portfolio_unbooked else 0,
            'thisWeekUrgent': len([d for d in portfolio_unbooked if d.get('bookingTarget') and (date.fromisoformat(d['bookingTarget']) - today).days <= 7]),
            'atRisk': len([d for d in all_t1t2 if d['overdue']]),
        },
        'statsByTier': {
            'tier1': {
                'total': len([d for d in districts if d['tierNum'] == 1]),
                'completed': len([d for d in districts if d['tierNum'] == 1 and d['completed']]),
                'booked': len([d for d in districts if d['tierNum'] == 1 and d['booked']]),
                'remaining': len([d for d in districts if d['tierNum'] == 1 and not d['completed'] and not d['booked']]),
                'overdue': len([d for d in districts if d['tierNum'] == 1 and d['overdue']]),
            },
            'tier2': {
                'total': len([d for d in districts if d['tierNum'] == 2]),
                'completed': len([d for d in districts if d['tierNum'] == 2 and d['completed']]),
                'booked': len([d for d in districts if d['tierNum'] == 2 and d['booked']]),
                'remaining': len([d for d in districts if d['tierNum'] == 2 and not d['completed'] and not d['booked']]),
                'overdue': len([d for d in districts if d['tierNum'] == 2 and d['overdue']]),
            },
            'tier3': {
                'total': len([d for d in districts if d['tierNum'] == 3]),
                'completed': 0,
                'booked': 0,
                'remaining': len([d for d in districts if d['tierNum'] == 3]),
                'overdue': 0,
            }
        }
    },
    'csms': csm_data
}

os.makedirs('public/data', exist_ok=True)
with open('public/data/snapshot.json', 'w') as f:
    json.dump(snapshot, f, indent=2, default=str)

print(f"Done. {len(districts)} districts written to public/data/snapshot.json")
for slug in csm_slugs:
    s = csm_data[slug]['stats']
    print(f"  {slug}: {s['total']} districts, {s['booked']} booked, {s['overdue']} overdue")
