#!/usr/bin/env python3
"""
Pilotage de l'agenda Google du groupe.

Usage :
  list                                 les calendriers accessibles
  create <nom>                         créer un calendrier
  share <calId> <email> [role]         partager (role: reader|writer|owner)
  public <calId> [on|off]              rendre le calendrier public ou non
  events <calId>                       lister les événements
  import <calId> <fichier.ics>         importer des événements depuis un .ics
  feed <calId>                         afficher l'URL du flux ICS public
  add <calId> <titre> <début> [fin] [lieu] [description]
  delete <calId> <eventId>             supprimer un événement
"""
import pathlib
import sys

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN = pathlib.Path('.secrets/google-token.json')
if not TOKEN.exists():
    sys.exit("Jeton absent : lance d'abord scripts/google_connect.py")

service = build('calendar', 'v3',
                credentials=Credentials.from_authorized_user_file(str(TOKEN)),
                cache_discovery=False)


def cal_list():
    for c in service.calendarList().list().execute().get('items', []):
        drapeau = ' (principal)' if c.get('primary') else ''
        print(f"  {c['summary']}{drapeau}\n      id   : {c['id']}\n      accès: {c.get('accessRole')}")


def cal_create(nom):
    c = service.calendars().insert(body={'summary': nom, 'timeZone': 'Europe/Paris'}).execute()
    print(f"  créé : {c['summary']}\n      id : {c['id']}")


def cal_share(cal, email, role='writer'):
    r = service.acl().insert(calendarId=cal, body={
        'role': role, 'scope': {'type': 'user', 'value': email}}).execute()
    print(f"  {email} → {r['role']}")


def cal_public(cal, etat='on'):
    if etat == 'on':
        service.acl().insert(calendarId=cal, body={
            'role': 'reader', 'scope': {'type': 'default'}}).execute()
        print('  calendrier rendu public')
    else:
        service.acl().delete(calendarId=cal, ruleId='default').execute()
        print('  calendrier redevenu privé')


def cal_events(cal):
    items = service.events().list(calendarId=cal, maxResults=100,
                                  orderBy='startTime', singleEvents=True).execute().get('items', [])
    print(f'  {len(items)} événement(s)')
    for e in items:
        d = e['start'].get('date') or e['start'].get('dateTime', '')[:16].replace('T', ' ')
        lieu = f"  @ {e['location']}" if e.get('location') else ''
        print(f"  {d:17} {e.get('summary', '(sans titre)')}{lieu}")


def desechappe(valeur):
    """Inverse l'échappement iCalendar (RFC 5545 §3.3.11)."""
    out, i = [], 0
    while i < len(valeur):
        if valeur[i] == chr(92) and i + 1 < len(valeur):
            suivant = valeur[i + 1]
            out.append({'n': chr(10), 'N': chr(10)}.get(suivant, suivant))
            i += 2
        else:
            out.append(valeur[i])
            i += 1
    return ''.join(out)


def cal_import(cal, fichier):
    """Un .ics est importé événement par événement : l'API n'avale pas un VCALENDAR entier."""
    sys.path.insert(0, 'scripts')
    import re
    texte = pathlib.Path(fichier).read_text(encoding='utf-8')
    blocs = re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', texte.replace('\r\n', '\n'), re.S)
    n = 0
    for bloc in blocs:
        champs = {}
        for ligne in re.sub(r'\n[ \t]', '', bloc).strip().split('\n'):
            if ':' not in ligne:
                continue
            cle, _, val = ligne.partition(':')
            champs[cle.split(';')[0]] = val.strip()
            if cle.startswith('DTSTART'):
                champs['_start_raw'] = (cle, val.strip())
            if cle.startswith('DTEND'):
                champs['_end_raw'] = (cle, val.strip())

        def borne(brut):
            cle, val = brut
            if 'VALUE=DATE' in cle or len(val) == 8:
                return {'date': f'{val[0:4]}-{val[4:6]}-{val[6:8]}'}
            return {'dateTime': f'{val[0:4]}-{val[4:6]}-{val[6:8]}T{val[9:11]}:{val[11:13]}:{val[13:15]}',
                    'timeZone': 'Europe/Paris'}

        corps = {
            'summary': desechappe(champs.get('SUMMARY', '')),
            'start': borne(champs['_start_raw']),
            'end': borne(champs['_end_raw']),
        }
        if champs.get('LOCATION'):
            corps['location'] = desechappe(champs['LOCATION'])
        if champs.get('DESCRIPTION'):
            corps['description'] = desechappe(champs['DESCRIPTION'])

        service.events().insert(calendarId=cal, body=corps).execute()
        n += 1
        print(f"  importé : {corps['summary']}")
    print(f'  {n} événement(s)')


def cal_add(cal, titre, debut, fin=None, lieu=None, description=None):
    """
    Ajoute un concert.

    debut/fin : AAAA-MM-JJ pour une journée entière, ou AAAA-MM-JJTHH:MM.
    Sans fin, un événement daté dure 3 h et un événement sur la journée un jour.
    """
    from datetime import date, datetime, timedelta

    def borne(v, journee_suivante=False):
        if 'T' in v:
            return {'dateTime': v if len(v) > 16 else v + ':00', 'timeZone': 'Europe/Paris'}
        d = date.fromisoformat(v)
        return {'date': str(d + timedelta(days=1)) if journee_suivante else str(d)}

    if fin is None:
        if 'T' in debut:
            fin_v = (datetime.fromisoformat(debut) + timedelta(hours=3)).isoformat(timespec='minutes')
            fin_b = borne(fin_v)
        else:
            fin_b = borne(debut, journee_suivante=True)
    else:
        fin_b = borne(fin, journee_suivante='T' not in fin)

    corps = {'summary': titre, 'start': borne(debut), 'end': fin_b}
    if lieu:
        corps['location'] = lieu
    if description:
        corps['description'] = description

    e = service.events().insert(calendarId=cal, body=corps).execute()
    print(f"  ajouté : {e['summary']}  ({e['start'].get('date') or e['start'].get('dateTime')})")
    print(f"      id : {e['id']}")


def cal_delete(cal, event_id):
    service.events().delete(calendarId=cal, eventId=event_id).execute()
    print(f'  supprimé : {event_id}')


def cal_feed(cal):
    from urllib.parse import quote
    print(f'  public : https://calendar.google.com/calendar/ical/{quote(cal)}/public/basic.ics')


ACTIONS = {'list': cal_list, 'create': cal_create, 'share': cal_share, 'public': cal_public,
           'events': cal_events, 'import': cal_import, 'feed': cal_feed,
           'add': cal_add, 'delete': cal_delete}

if len(sys.argv) < 2 or sys.argv[1] not in ACTIONS:
    sys.exit(__doc__)
ACTIONS[sys.argv[1]](*sys.argv[2:])
