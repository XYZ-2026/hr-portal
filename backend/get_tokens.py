import os
import pickle
import json
from gmail_auth import get_gmail_service, TOKEN_PATH, CREDENTIALS_PATH

def main():
    print("=========================================================")
    print("STARTING GMAIL INTERACTIVE OAUTH AUTHENTICATION FLOW...")
    print("=========================================================")
    print("1. A browser window will open.")
    print("2. Choose your Gmail account (sairamjoshi.cs@gmail.com).")
    print("3. Click 'Advanced' -> 'Go to Concept Simplified (unsafe)' if prompted.")
    print("4. Grant the permissions and complete the flow.")
    print("=========================================================\n")
    
    # Delete old token.pkl to force fresh OAuth flow
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            print("[Clean] Removed old expired token.pkl.")
        except Exception as e:
            print(f"[Error] Failed to remove token.pkl: {e}")
            
    try:
        # Run local server flow
        get_gmail_service(interactive=True)
        
        # Load credentials
        with open(CREDENTIALS_PATH, 'r') as f:
            creds_data = json.load(f)
            
        client_type = list(creds_data.keys())[0]
        client_id = creds_data[client_type]["client_id"]
        client_secret = creds_data[client_type]["client_secret"]
        
        # Load token
        with open(TOKEN_PATH, 'rb') as f:
            token_data = pickle.load(f)
            
        refresh_token = getattr(token_data, 'refresh_token', None)
        
        print("\n=========================================================")
        print("🎉 AUTHENTICATION SUCCESSFUL!")
        print("=========================================================")
        print("Please copy and add these variables to your Railway backend settings:")
        print("=========================================================\n")
        print(f"GMAIL_CLIENT_ID={client_id}")
        print(f"GMAIL_CLIENT_SECRET={client_secret}")
        print(f"GMAIL_REFRESH_TOKEN={refresh_token}")
        print("\n=========================================================")
    except Exception as e:
        print(f"\n❌ Error during authentication: {e}")

if __name__ == '__main__':
    main()
