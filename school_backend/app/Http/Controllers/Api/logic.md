# AuthController Logic

## `login(Request $request)`
- **Purpose:** Authenticate users (Admin, Teacher, Student, Parent) using Email and Password for now. 
- **Validation:** Requires a valid `email` string and a `password`.
- **Process:** 
  1. Uses `Auth::attempt` to verify the credentials.
  2. If successful, retrieves the user and generates a new Sanctum API token (`auth_token`).
  3. Returns a JSON response containing a success message, the token, and the user object.
- **Failures:** Returns a `401 Unauthorized` response with a generic "Invalid credentials" message if authentication fails.
- **Notes:** Future implementation may transition to OTP-based login as per requirements.
