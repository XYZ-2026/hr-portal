"""
Gmail OAuth Authentication — Server-Safe

Loads credentials from token.pkl, refreshes if expired.
Falls back to console-based auth flow (no browser popups on server).
"""

import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

# Paths relative to this file's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_DIR = os.path.join(BASE_DIR, 'credentials')
TOKEN_PATH = os.path.join(CREDENTIALS_DIR, 'token.pkl')
CREDENTIALS_PATH = os.path.join(CREDENTIALS_DIR, 'credentials.json')


def get_gmail_service():
    """
    Get an authenticated Gmail API service instance.
    
    Uses cached token from token.pkl. If expired, refreshes automatically.
    If no token exists, runs a console-based OAuth flow (server-safe, no browser popup).
    """
    import base64
    
    # Auto-restore credentials from environment variables if not present on disk (for server environments)
    os.makedirs(CREDENTIALS_DIR, exist_ok=True)
    
    gmail_credentials_json = os.environ.get("GMAIL_CREDENTIALS_JSON")
    if gmail_credentials_json and not os.path.exists(CREDENTIALS_PATH):
        with open(CREDENTIALS_PATH, 'w', encoding='utf-8') as f:
            f.write(gmail_credentials_json)
        print("[Gmail Auth] Restored credentials.json from environment variable.")
        
    gmail_token_b64 = os.environ.get("GMAIL_TOKEN_B64")
    if gmail_token_b64 and not os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'wb') as f:
            f.write(base64.b64decode(gmail_token_b64))
        print("[Gmail Auth] Restored token.pkl from environment variable.")

    creds = None

    # Load cached token
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'rb') as token_file:
            creds = pickle.load(token_file)

    # Refresh or re-authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("[Gmail Auth] Refreshing expired token...")
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Gmail credentials.json not found at {CREDENTIALS_PATH}. "
                    "Please place your OAuth credentials file there."
                )
            print("[Gmail Auth] No valid token found. Starting OAuth flow...")
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_PATH,
                SCOPES
            )
            # Server-safe: use run_local_server without opening browser
            # The URL will be printed to console for manual auth
            creds = flow.run_local_server(
                port=0,
                open_browser=False
            )

        # Save refreshed/new token
        os.makedirs(CREDENTIALS_DIR, exist_ok=True)
        with open(TOKEN_PATH, 'wb') as token_file:
            pickle.dump(creds, token_file)
        print("[Gmail Auth] Token saved successfully.")

    service = build('gmail', 'v1', credentials=creds)
    return service
