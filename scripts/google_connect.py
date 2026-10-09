#!/usr/bin/env python3
"""
Autorise l'accès à l'agenda Google du groupe, une fois pour toutes.

Google ne propose aucun jeton d'API personnel pour un compte Gmail : le seul
accès programmatique passe par un consentement OAuth, qui exige un client
déclaré dans un projet Google Cloud. Ce script consomme ce client et range le
jeton résultant dans .secrets/, hors de Git.
"""
import json
import pathlib
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SECRETS = pathlib.Path('.secrets')
CLIENT = SECRETS / 'google-client.json'
TOKEN = SECRETS / 'google-token.json'
SCOPES = ['https://www.googleapis.com/auth/calendar']

if not CLIENT.exists():
    sys.exit(
        f"Fichier {CLIENT} absent.\n"
        "Il s'agit du JSON d'identifiants OAuth « Application de bureau »\n"
        "téléchargé depuis la console Google Cloud."
    )

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT), SCOPES)

# open_browser=False : l'URL est affichée pour être ouverte à la main, ce qui
# fonctionne aussi quand le script tourne sans environnement graphique.
creds = flow.run_local_server(
    port=0,
    open_browser=False,
    authorization_prompt_message='Ouvre cette adresse pour autoriser l\'accès :\n\n{url}\n',
    success_message='Autorisation accordée. Tu peux fermer cet onglet.',
)

TOKEN.write_text(creds.to_json(), encoding='utf-8')
TOKEN.chmod(0o600)

print(f'\nJeton enregistré dans {TOKEN}')
print('Rafraîchissement automatique :', 'oui' if creds.refresh_token else 'NON — relancer avec access_type=offline')
