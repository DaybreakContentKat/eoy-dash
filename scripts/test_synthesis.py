"""Tests for the BTS synthesis path in generate_bts.py.

Two layers:
  1. Pure extraction — parse_tab pulls the right synthesis fields out of the
     real CSM/AM and Async header rows (no network, always runs).
  2. Live API — synthesize() returns valid JSON with the four expected keys.
     Skipped automatically if ANTHROPIC_API_KEY isn't available.

Run:  python3 scripts/test_synthesis.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_bts as g  # noqa: E402

g.load_dotenv_local()

# --- Real header rows (verbatim from the End of Year Review responses sheet) ---

CSM_HEADER = [
    'Timestamp', 'District Name', 'Account Owner', 'Summer comms discussed? (required)',
    'District Comms Channels\n(select all that apply - sending through multiple '
    'channels helps all parents learn and growth with Daybreak.)',
    'Primary Summer Contact (name)', 'Primary Summer Contact (email)',
    'Additional Summer Contact Names + Emails\n(list any other school staff members '
    'working over the summer who can support with outreach to families)',
    'Summer Resource Post Confirmed? (required)', 'Kickoff with Leadership',
    'Staff Training Date (required)', 'Staff Training Scheduled? (required)',
    'Admin / Principal Outreach (required)', 'Principal contact list received? (required)',
    'Teacher Resource Expression of Interest\nWe are looking at expanding support '
    'through content for teachers. What kinds of resources do you need most for teachers? ',
    'Staff Files Status (required)', 'Expected Finalized File Date or Notes', 'BTS Events ',
    'Enrollment Packet Inclusion?\n*Add a blurb or one-pager about Daybreak into your '
    'back to school packets to let families know about the Daybreak option. ',
    'What do you find most helpful about Daybreak content (toolkits, case studies, how '
    'tos, etc.)? \n\nAre there any additional resources or types of content we could '
    'provide next year to better support you?',
    'Feedback', 'Outstanding items still needed from District ', 'Gong Recording Link',
]

ASYNC_HEADER = [
    'Timestamp', 'Your Name', 'District Name',
    'Are you planning to send a message to families letting them know Daybreak support '
    'continues over the summer? (required)',
    'Who is the best person on your team to reach over the summer if we need to '
    'coordinate? We just need a name and email." (required)',
    'Each year we update the list of staff who have access to Daybreak. This helps us '
    'make sure the right people can log in and submit referrals when school starts (required)',
    "We're building new ways to keep your principals and administrators informed about "
    'Daybreak. Would you be open to us reaching out to them directly',
    'Would your leadership team be open to a short planning call this summer to set '
    'goals for the fall?',
    'Anything we should know heading into the fall? Questions, changes at your district, '
    'feedback on last year? If something comes to mind later, no worries, just tell your '
    'Daybreak contact.',
    'How does your district usually communicate with families? Select all that apply.',
    'What would make it easier to send a message to families? Select all that apply.',
    "Is there someone else at your district who handles family communications? If so, "
    "drop their name and email and we'll reach out directly.",
]

# Two real CSM rows (Buena Park ESD, Chicago Heights) trimmed to the columns above.
CSM_ROWS = [
    ['5/4/2026 10:12:43', 'Buena Park ESD', 'Brianna ', 'Yes',
     'Text - parentsquare, peachjar etc, Emails - newseltter or blasts',
     'Madeline Morrison', 'mmorrison@bpsd.u', 'Jackie Gallardo-Hoffmaster', 'Yes',
     'End of July', 'Student come back the 12th', 'Tentative Hold', 'Admin meeting',
     'Yes',
     'Varies site to site - embedded within PBIS - we can send them stuff to include '
     'within this. Going to share a blurb/flyer they can share with teachers',
     'Confirmed we will use this year\'s file for now', 'July 27th can review',
     'August 5th', 'Pending Approval', '', '', '', ''],
    ['5/12/2026 9:40:32', 'Chicago Heights', 'Monica Knott', 'Yes',
     'Text - parentsquare, peachjar etc, Emails - newseltter or blasts',
     'Kenyea Beach', 'KBeach@sd170.com', 'Shanall Nash', 'Yes', 'TBD',
     'Async training followed by zoom', 'Not Yet', 'e-mail', 'No',
     'struggle with humanity side of MH, personalize BH; cultural diversity resources '
     'for discipline, MH and school partnerships and some FAQS 101',
     'Confirmed we will use this year\'s file for now', 'Amy Steepleton',
     'will plan over the summer', 'Yes',
     'Finds all content helpful; content to reduce MH stigma',
     'First year has been a good year and partnership', 'none', ''],
]

# Two real async rows (Whiteville City Schools, Streator 4).
ASYNC_ROWS = [
    ['5/19/2026 7:42:46', 'April Corbett', 'Whiteville City Schools',
     'Not yet, need help with ideas or language', 'April Corbett, acorbett@whiteville.k12.nc.us',
     "We can use this year's file for now", 'Yes, go for it', "Yes, let's set it up",
     'None at this time.', 'Text platform (ParentSquare, Peachjar, etc.), Other (fill in)',
     'Sample language or a template I can use, A flyer or image I can attach', ''],
    ['5/19/2026 10:28:40', 'Anne McDonnell', 'Streator 4', 'Yes, already sent',
     'Anne McDonnell amcdonnell@ses44.net', "We can use this year's file for now",
     'Not right now', 'Not needed right now',
     'We started Daybreak late and want to spread the word more next year.',
     'Text platform (ParentSquare, Peachjar, etc.), Email (newsletter or blasts)',
     'A flyer or image I can attach', ''],
]


def test_extraction():
    _, csm = g.parse_tab(CSM_HEADER, CSM_ROWS, True)
    _, asy = g.parse_tab(ASYNC_HEADER, ASYNC_ROWS, False)

    bp = csm[0]['synth']
    assert 'PBIS' in bp['teacher_resources'], bp['teacher_resources']
    assert bp['comms_channels'].startswith('Text - parentsquare'), bp['comms_channels']
    assert bp['outstanding_items'] == '', repr(bp['outstanding_items'])
    assert bp['family_comms_plan'] == '', repr(bp['family_comms_plan'])

    ch = csm[1]['synth']
    assert 'cultural diversity' in ch['teacher_resources'], ch['teacher_resources']
    assert ch['feedback'].startswith('First year'), ch['feedback']
    assert ch['outstanding_items'] == 'none', repr(ch['outstanding_items'])

    wv = asy[0]['synth']
    assert wv['teacher_resources'] == '', repr(wv['teacher_resources'])
    assert wv['comms_channels'].startswith('Text platform'), wv['comms_channels']
    assert wv['family_comms_plan'].startswith('Not yet'), wv['family_comms_plan']
    # async "Anything we should know... feedback on last year?" maps to feedback
    assert wv['feedback'] == 'None at this time.', repr(wv['feedback'])

    st = asy[1]['synth']
    assert 'spread the word' in st['feedback'], st['feedback']

    print('  extraction: OK')


def test_build_rows():
    tracker = {
        'Buena Park ESD': {'owner': 'Brianna Masciel', 'tier': 1, 'ldos': None,
                           'shortName': 'Buena Park', 'coOwned': False},
        'Chicago Heights': {'owner': 'Monica Knott', 'tier': 1, 'ldos': None,
                            'shortName': 'Chicago Heights', 'coOwned': False},
    }
    match = g.build_matcher(tracker, {})
    _, csm = g.parse_tab(CSM_HEADER, CSM_ROWS, True)
    _, asy = g.parse_tab(ASYNC_HEADER, ASYNC_ROWS, False)
    rows = g.build_synthesis_rows(csm + asy, match, tracker)
    # all 4 rows have at least one synthesis field
    assert len(rows) == 4, len(rows)
    bp = next(r for r in rows if r['district'] == 'Buena Park')
    assert bp['owner'] == 'Brianna Masciel', bp['owner']
    # unmatched async district falls back to its raw name + form owner
    wv = next(r for r in rows if r['district'] == 'Whiteville City Schools')
    assert set(g.SYNTH_KEYS).issubset(wv), wv.keys()
    print(f'  build_rows: OK ({len(rows)} rows)')
    return rows


def test_live_api(rows):
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print('  live_api: SKIPPED (no ANTHROPIC_API_KEY)')
        return
    result = g.synthesize(rows)
    assert result is not None, 'synthesize returned None'
    for key in ('teacher_themes', 'comms_channels', 'outstanding_items', 'feedback_themes'):
        assert key in result, f'missing key {key}: {list(result)}'
        assert isinstance(result[key], list), f'{key} not a list'
    print('  live_api: OK')
    print(json.dumps(result, indent=2)[:1500])


if __name__ == '__main__':
    print('test_synthesis:')
    test_extraction()
    rows = test_build_rows()
    test_live_api(rows)
    print('all passed.')
