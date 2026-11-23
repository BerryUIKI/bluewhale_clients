# Security Policy

## Supported versions

Bluewhale Clients is pre-alpha. Only the `main` branch and the latest tagged pre-release receive security fixes.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting for this repository: open the **Security** tab and choose **Report a vulnerability**.

Include the affected application (Windows or Android), version or commit, platform version, impact, reproduction steps, and any suggested mitigation. Never include real financial data, vault keys, encryption keys, recovery keys, or ciphertext from a real ledger; use synthetic data.

## Response expectations

- Acknowledgement within 3 business days.
- Initial assessment within 10 business days.
- A coordinated disclosure date agreed after a fix is available.

## Scope

In scope: the Windows and Android applications, the Tauri command boundary, local storage, the key hierarchy, biometric app lock, Android background sync, installer and update integrity, and WebView2/WebView accessibility or security behavior that affects users.

Out of scope: third-party dependency issues already fixed upstream (report them upstream and open a private advisory if Bluewhale must upgrade), and findings that require an already-compromised device.

## Safe harbor

Good-faith research that follows this policy, avoids privacy violations, avoids destructive testing, and does not exfiltrate data will not be pursued legally. Do not test infrastructure or accounts you do not own or have permission to test.
