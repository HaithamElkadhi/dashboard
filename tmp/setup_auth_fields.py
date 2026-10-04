import json
import pathlib
import urllib.request
import urllib.error

BASE = 'appVHjUwJBU3wGrOW'
USERS = 'tblYzfwb0CBFXOFsz'
SESSIONS = 'tblJ85bJE0loqwNvU'
env = dict(line.split('=', 1) for line in pathlib.Path('.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
token = env['AIRTABLE_API_KEY'].strip().strip('"').strip("'")

def call(path='', method='GET', body=None):
    req = urllib.request.Request('https://api.airtable.com/v0/meta/bases/' + BASE + '/tables' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        print('Airtable error:', error.code, error.read().decode())
        raise SystemExit(1)

tables = {t['id']: t for t in call()['tables']}
specs = {
    USERS: [('username', 'singleLineText', None), ('display_name', 'singleLineText', None),
            ('password_hash', 'multilineText', None), ('is_active', 'checkbox', {'icon': 'check', 'color': 'greenBright'})],
    SESSIONS: [('token_hash', 'singleLineText', None),
               ('user', 'multipleRecordLinks', {'linkedTableId': USERS}),
               ('expires_at', 'dateTime', {'dateFormat': {'name': 'iso'}, 'timeFormat': {'name': '24hour'}, 'timeZone': 'utc'})]
}
for table_id, fields in specs.items():
    table = tables[table_id]
    existing = {f['name']: f for f in table['fields']}
    for index, (name, field_type, options) in enumerate(fields):
        if name in existing:
            print('Already exists:', table['name'], name)
            continue
        if index == 0:
            primary = next(f for f in table['fields'] if f['id'] == table['primaryFieldId'])
            if primary['name'] != 'Name' or primary['type'] != field_type:
                raise SystemExit('Unexpected primary field; refusing to rename')
            call('/' + table_id + '/fields/' + primary['id'], 'PATCH', {'name': name})
        else:
            body = {'name': name, 'type': field_type}
            if options is not None:
                body['options'] = options
            call('/' + table_id + '/fields', 'POST', body)
        print('Configured:', table['name'], name)

for table in call()['tables']:
    if table['id'] in specs:
        print(json.dumps({'id': table['id'], 'name': table['name'], 'fields': table['fields']}, ensure_ascii=False))
