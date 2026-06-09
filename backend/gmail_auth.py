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


def get_gmail_service(interactive=False):
    """
    Get an authenticated Gmail API service instance.
    
    Uses cached token from token.pkl. If expired, refreshes automatically.
    If no token exists, runs a console-based OAuth flow (server-safe, no browser popup).
    """
    import base64
    
    # Auto-restore credentials from environment variables if not present on disk (for server environments)
    os.makedirs(CREDENTIALS_DIR, exist_ok=True)
    
    gmail_credentials_json = os.environ.get("GMAIL_CREDENTIALS_JSON")
    gmail_token_b64 = os.environ.get("GMAIL_TOKEN_B64")
    
    print(f"[Gmail Auth Diagnostic] GMAIL_CREDENTIALS_JSON env var exists: {gmail_credentials_json is not None}")
    if gmail_credentials_json:
        print(f"[Gmail Auth Diagnostic] GMAIL_CREDENTIALS_JSON length: {len(gmail_credentials_json)}")
        
    print(f"[Gmail Auth Diagnostic] GMAIL_TOKEN_B64 env var exists: {gmail_token_b64 is not None}")
    if gmail_token_b64:
        print(f"[Gmail Auth Diagnostic] GMAIL_TOKEN_B64 length: {len(gmail_token_b64)}")
    
    if gmail_credentials_json and not os.path.exists(CREDENTIALS_PATH):
        try:
            with open(CREDENTIALS_PATH, 'w', encoding='utf-8') as f:
                f.write(gmail_credentials_json.strip())
            print(f"[Gmail Auth] Restored credentials.json to {CREDENTIALS_PATH}")
        except Exception as e:
            print(f"[Gmail Auth Error] Failed to write credentials.json: {e}")
        
    if gmail_token_b64 and not os.path.exists(TOKEN_PATH):
        try:
            with open(TOKEN_PATH, 'wb') as f:
                f.write(base64.b64decode(gmail_token_b64.strip()))
            print(f"[Gmail Auth] Restored token.pkl to {TOKEN_PATH}")
        except Exception as e:
            print(f"[Gmail Auth Error] Failed to write token.pkl: {e}")

    creds = None

    # Load cached token
    if os.path.exists(TOKEN_PATH):
        with open(TOKEN_PATH, 'rb') as token_file:
            creds = pickle.load(token_file)

    # Refresh or re-authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("[Gmail Auth] Refreshing expired token...")
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[Gmail Auth Error] Failed to refresh token: {e}")
                # Delete the invalid/expired token file so we can recreate it
                if os.path.exists(TOKEN_PATH):
                    try:
                        os.remove(TOKEN_PATH)
                        print("[Gmail Auth] Removed invalid token.pkl file.")
                    except Exception as rm_err:
                        print(f"[Gmail Auth Error] Could not remove token.pkl: {rm_err}")
                raise RuntimeError(
                    "Gmail token has expired or been revoked. "
                    "Please run 'python backend/gmail_auth.py' in your terminal to re-authenticate."
                ) from e
        else:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Gmail credentials.json not found at {CREDENTIALS_PATH}. "
                    "Please place your OAuth credentials file there."
                )
            
            if not interactive:
                raise RuntimeError(
                    "Gmail token has expired or is missing. "
                    "Please run 'python backend/gmail_auth.py' in your terminal to authenticate."
                )

            print("[Gmail Auth] No valid token found. Starting OAuth flow...")
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_PATH,
                SCOPES
            )
            # When running interactively in terminal, open browser for ease of login
            creds = flow.run_local_server(
                port=0,
                open_browser=True,
                access_type='offline',
                prompt='consent'
            )

        # Save refreshed/new token
        os.makedirs(CREDENTIALS_DIR, exist_ok=True)
        with open(TOKEN_PATH, 'wb') as token_file:
            pickle.dump(creds, token_file)
        print("[Gmail Auth] Token saved successfully.")

    service = build('gmail', 'v1', credentials=creds)
    return service

if __name__ == '__main__':
    print("[Gmail Auth] Starting interactive authentication...")
    # Force a fresh authentication flow by deleting any existing local token.pkl first
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            print("[Gmail Auth] Removed existing token.pkl to force fresh login.")
        except Exception as e:
            print(f"[Gmail Auth Error] Failed to delete token.pkl: {e}")
            
    get_gmail_service(interactive=True)
