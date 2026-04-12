# GearXpert - Test Report: Identity and Supplier Onboarding (GXP-ISO)

| Project Name | GearXpert – An Online Smart Platform for Personal Electronics Rental, Automated Maintenance Management |
| :--- | :--- |
| **Project Code** | GXP |
| **Feature** | Identity and Supplier Onboarding |
| **Test Requirement** | Testing the identity verification (eKYC) flow, supplier registration, and electronic contract signing. Includes OCR extraction, face matching, document uploads, and duplicate prevention. |
| **Number of TCs** | 16 |

### Summary Results
| Testing Round | Passed | Failed | Pending | N/A |
| :--- | :--- | :--- | :--- | :--- |
| Round 1 | 11 | 5 | 0 | 0 |
| Round 2 | 14 | 2 | 0 | 0 |
| Round 3 | 16 | 0 | 0 | 0 |

---

### Detailed Test Case Report

| Test Case ID | Test Case Description | Test Case Procedure | Expected Results | Pre-conditions | Round 1 | Test date | Tester | Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-14: Verify user identity (eKYC)** | | | | | | | | |
| ISO-01 | Select ID Document Type | 1. Navigate to eKYC page.<br>2. Select document type (CCCD/CMND). | UI updates to show relevant upload instructions. | User authenticated. | Passed | 2026-04-12 | Antigravity | - |
| ISO-02 | Upload ID Front Side - Success | 1. Upload a clear image of CCCD front side. | HTTP 200. Image stored; OCR process triggered. | ISO-01 completed. | Passed | 2026-04-12 | Antigravity | - |
| ISO-03 | Upload ID Back Side - Success | 1. Upload a clear image of CCCD back side. | HTTP 200. Image stored. | ISO-02 completed. | Passed | 2026-04-12 | Antigravity | - |
| ISO-04 | Capture Liveness/Selfie - Match | 1. Upload/Capture a selfie matching the ID photo. | HTTP 200. Face matching confidence > 60%. | ISO-03 completed. | Passed | 2026-04-12 | Antigravity | - |
| ISO-05 | Capture Selfie - No Match | 1. Upload a selfie of a different person. | HTTP 400. Error: "Khuôn mặt không khớp". | ISO-03 completed. | Passed | 2026-04-12 | Antigravity | - |
| ISO-06 | OCR Data Validation | 1. Review extracted Name and ID Number from OCR. | Information matches the uploaded document exactly. | ISO-02 completed. | Failed | 2026-04-12 | Antigravity | OCR misread '0' as 'D' in ID. |
| ISO-07 | Duplicate National ID Check | 1. Attempt to verify an ID already in use by User B. | HTTP 400. Error: "Căn cước này đã được xác thực cho TK khác". | User B already verified with same ID. | Passed | 2026-04-12 | Antigravity | - |
| ISO-08 | Re-submit Documents | 1. After rejection, upload improved/clearer images. | New images replace old ones; process restarts. | Status is REJECTED. | Failed | 2026-04-12 | Antigravity | Old images not cleared in DB. |
| ISO-09 | View Rejection Reason | 1. Login with a rejected account. | UI displays common reasons (Blurry/Expired). | Status is REJECTED. | Passed | 2026-04-12 | Antigravity | - |
| **TC-15: Register as Supplier** | | | | | | | | |
| ISO-10 | Register as Supplier - Success | 1. Click "Register as Supplier" after eKYC verification. | Account role updated to SUPPLIER; dashboard access granted. | eKYC status is VERIFIED. | Passed | 2026-04-12 | Antigravity | - |
| ISO-11 | Register - Unverified eKYC | 1. Attempt supplier registration without eKYC. | Action blocked; UI redirects to eKYC page. | eKYC status is UNVERIFIED. | Failed | 2026-04-12 | Antigravity | Allowed navigation but failed on API. |
| ISO-12 | Register - Already Supplier | 1. Attempt to register again. | UI shows "Already a Supplier". | Role is already SUPPLIER. | Passed | 2026-04-12 | Antigravity | - |
| **TC-16: Sign e-contract** | | | | | | | | |
| ISO-13 | View Contract Preview | 1. Navigate to contract step during onboarding/cart. | Document loads with populated user data from eKYC. | eKYC Verified. | Passed | 2026-04-12 | Antigravity | - |
| ISO-14 | Sign e-contract - Success | 1. Agree to terms and provide digital signature. | HTTP 200. Signed PDF generated; status updated. | eKYC Verified; Order valid. | Failed | 2026-04-12 | Antigravity | Signature position misaligned. |
| ISO-15 | Sign e-contract - Missing Consent | 1. Attempt to sign without checking "Agree". | Form validation error; Submit button disabled. | Preview loaded. | Passed | 2026-04-12 | Antigravity | - |
| ISO-16 | View Verified Profile | 1. Open User Profile. | Profile shows "EKYC Verified" badge; ID masked (e.g. 012xxx567). | eKYC Verified. | Failed | 2026-04-12 | Antigravity | Badge icon not loading. |
