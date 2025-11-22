import requests
import time
import random
import string

USERS_SERVICE_URL = "http://users-service:3103"
AUTH_SERVICE_URL = "http://auth-service:3105"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_strong_password():
    return "Abc123!@" + generate_random_string(8)

def print_result(test_name, success, message=""):
    status = "PASS" if success else "FAIL"
    color = "\033[92m" if success else "\033[91m"
    reset = "\033[0m"
    print(f"{color}[{status}] {test_name}{reset} {message}")

def test_users_service():
    print("\n--- Testing Users Service ---")
    
    # 1. Create User - Success
    username = "testuser_" + generate_random_string(5)
    email = f"{username}@example.com"
    password = generate_strong_password()
    
    payload = {
        "username": username,
        "email": email,
        "password": password,
        "display_name": username
    }
    
    try:
        response = requests.post(f"{USERS_SERVICE_URL}/users", json=payload)
        if response.status_code == 201:
            print_result("Create User (Valid)", True)
            user_id = response.json()['user']['id']
        else:
            print_result("Create User (Valid)", False, f"Status: {response.status_code}, Body: {response.text}")
            return # Stop if creation fails
    except Exception as e:
        print_result("Create User (Valid)", False, f"Exception: {e}")
        return

    # 2. Create User - Duplicate (Conflict)
    try:
        response = requests.post(f"{USERS_SERVICE_URL}/users", json=payload)
        if response.status_code == 409:
            print_result("Create User (Duplicate)", True)
        else:
            print_result("Create User (Duplicate)", False, f"Expected 409, got {response.status_code}")
    except Exception as e:
        print_result("Create User (Duplicate)", False, f"Exception: {e}")

    # 3. Create User - Bad Input (Missing Email)
    bad_payload = payload.copy()
    del bad_payload['email']
    try:
        response = requests.post(f"{USERS_SERVICE_URL}/users", json=bad_payload)
        if response.status_code == 400:
            print_result("Create User (Missing Email)", True)
        else:
            print_result("Create User (Missing Email)", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        print_result("Create User (Missing Email)", False, f"Exception: {e}")

    # 4. Create User - Weak Password
    weak_payload = payload.copy()
    weak_payload['username'] = "weak_" + generate_random_string(5)
    weak_payload['email'] = f"{weak_payload['username']}@example.com"
    weak_payload['password'] = "weak"
    try:
        response = requests.post(f"{USERS_SERVICE_URL}/users", json=weak_payload)
        if response.status_code == 409:
            print_result("Create User (Weak Password)", True)
        else:
            print_result("Create User (Weak Password)", False, f"Expected 409, got {response.status_code}")
    except Exception as e:
        print_result("Create User (Weak Password)", False, f"Exception: {e}")

    # 5. Login - Success
    login_payload = {
        "email": email,
        "password": password
    }
    try:
        response = requests.post(f"{USERS_SERVICE_URL}/auth/login", json=login_payload)
        if response.status_code == 200:
            print_result("Login (Valid)", True)
        else:
            print_result("Login (Valid)", False, f"Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print_result("Login (Valid)", False, f"Exception: {e}")

    # 6. Login - Invalid Credentials
    bad_login_payload = login_payload.copy()
    bad_login_payload['password'] = "wrongpassword"
    try:
        response = requests.post(f"{USERS_SERVICE_URL}/auth/login", json=bad_login_payload)
        if response.status_code == 401:
            print_result("Login (Invalid Credentials)", True)
        else:
            print_result("Login (Invalid Credentials)", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        print_result("Login (Invalid Credentials)", False, f"Exception: {e}")

def test_auth_service_2fa():
    print("\n--- Testing Auth Service (2FA) ---")

    # 1. Initiate 2FA Registration (Email)
    username = "2fa_test_" + generate_random_string(5)
    email = f"{username}@example.com"
    
    init_payload = {
        "username": username,
        "email": email,
        "authType": "email"
    }
    
    verification_token = None
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/auth/2fa/register/initiate", json=init_payload)
        if response.status_code == 200:
            print_result("2FA Initiate (Email)", True)
            verification_token = response.json().get('verificationToken')
        else:
            print_result("2FA Initiate (Email)", False, f"Status: {response.status_code}, Body: {response.text}")
            return
    except Exception as e:
        print_result("2FA Initiate (Email)", False, f"Exception: {e}")
        return

    # Note: We can't easily get the code sent via email/log without parsing logs or mocking.
    # However, for 'authApp', the secret is returned in the response, so we can generate the code.
    
    # 2. Initiate 2FA Registration (AuthApp)
    init_payload['authType'] = 'authApp'
    secret = None
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/auth/2fa/register/initiate", json=init_payload)
        if response.status_code == 200:
            print_result("2FA Initiate (AuthApp)", True)
            data = response.json()
            verification_token = data.get('verificationToken')
            secret = data.get('secret')
        else:
            print_result("2FA Initiate (AuthApp)", False, f"Status: {response.status_code}, Body: {response.text}")
            return
    except Exception as e:
        print_result("2FA Initiate (AuthApp)", False, f"Exception: {e}")
        return

    # 3. Verify 2FA Code (AuthApp)
    # We need to generate a TOTP code using the secret
    import hmac
    import struct
    import base64
    
    def get_totp_code(secret):
        # Decode base32 secret
        key = base64.b32decode(secret, casefold=True)
        # Calculate counter
        counter = int(time.time() / 30)
        msg = struct.pack(">Q", counter)
        digest = hmac.new(key, msg, 'sha1').digest()
        offset = digest[19] & 0xf
        code = (struct.unpack(">I", digest[offset:offset+4])[0] & 0x7fffffff) % 1000000
        return str(code).zfill(6)

    code = get_totp_code(secret)
    verify_payload = {
        "verificationToken": verification_token,
        "code": code
    }
    
    try:
        response = requests.post(f"{AUTH_SERVICE_URL}/auth/2fa/register/verify", json=verify_payload)
        if response.status_code == 200:
            print_result("2FA Verify (AuthApp)", True)
        else:
            print_result("2FA Verify (AuthApp)", False, f"Status: {response.status_code}, Body: {response.text}")
            return
    except Exception as e:
        print_result("2FA Verify (AuthApp)", False, f"Exception: {e}")
        return

    # 4. Complete 2FA Registration
    # We need a userId to complete registration. Let's create a user first.
    # But wait, the flow in LoginPage.ts suggests we register the user in Users service *after* verifying 2FA,
    # and pass the verificationToken to Users service, which then calls Auth service's complete.
    # So we should test that flow.
    
    print("\n--- Testing Full Registration Flow with 2FA ---")
    
    # Step 1: Initiate 2FA
    username_full = "fullflow_" + generate_random_string(5)
    email_full = f"{username_full}@example.com"
    password_full = generate_strong_password()
    
    init_payload_full = {
        "username": username_full,
        "email": email_full,
        "authType": "authApp"
    }
    
    resp_init = requests.post(f"{AUTH_SERVICE_URL}/auth/2fa/register/initiate", json=init_payload_full)
    if resp_init.status_code != 200:
        print_result("Full Flow: Initiate 2FA", False)
        return
    
    data_init = resp_init.json()
    v_token = data_init['verificationToken']
    secret_full = data_init['secret']
    
    # Step 2: Verify Code
    code_full = get_totp_code(secret_full)
    resp_verify = requests.post(f"{AUTH_SERVICE_URL}/auth/2fa/register/verify", json={
        "verificationToken": v_token,
        "code": code_full
    })
    
    if resp_verify.status_code != 200:
        print_result("Full Flow: Verify Code", False)
        return
        
    # Step 3: Create User (which calls Complete 2FA)
    create_user_payload = {
        "username": username_full,
        "email": email_full,
        "password": password_full,
        "authType": "authApp",
        "verificationToken": v_token
    }
    
    try:
        resp_create = requests.post(f"{USERS_SERVICE_URL}/users", json=create_user_payload)
        if resp_create.status_code == 201:
            print_result("Full Flow: Create User & Complete 2FA", True)
            user_id = resp_create.json()['user']['id']
        else:
            print_result("Full Flow: Create User & Complete 2FA", False, f"Status: {resp_create.status_code}, Body: {resp_create.text}")
            return
    except Exception as e:
        print_result("Full Flow: Create User & Complete 2FA", False, f"Exception: {e}")
        return

    # 5. Test Rate Limiting (Auth Service)
    print("\n--- Testing Rate Limiting ---")
    # We'll try to verify with a wrong code many times
    rate_limit_payload = {
        "userId": user_id,
        "code": "000000"
    }
    
    rate_limited = False
    for i in range(15): # Default sensitive limit is 10
        resp = requests.post(f"{AUTH_SERVICE_URL}/auth/2fa/verify", json=rate_limit_payload)
        if resp.status_code == 429:
            rate_limited = True
            break
    
    if rate_limited:
        print_result("Rate Limiting (2FA Verify)", True)
    else:
        print_result("Rate Limiting (2FA Verify)", False, "Did not hit rate limit after 15 attempts")

if __name__ == "__main__":
    try:
        test_users_service()
        test_auth_service_2fa()
    except requests.exceptions.ConnectionError:
        print("\033[91m[FAIL] Could not connect to services. Make sure they are running on ports 3103 and 3105.\033[0m")
