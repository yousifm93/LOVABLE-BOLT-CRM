# Plan: Activate Email Feature for Salma and Herman

## Status: ✅ COMPLETED

## Overview
Enabled full email access for `salma@mortgagebolt.org` and `herman@mortgagebolt.org`, including:
1. ✅ Unlocked their Email navigation permission so they can access the Email tab
2. ✅ Added their inboxes to the Email page sidebar (like Yousif and Scenarios)
3. ✅ Configured IMAP credentials so they can view their mailboxes

---

## Changes Made

### 1. Database: Updated Permissions ✅
Updated `user_permissions` table to unlock email access for both users:
- Salma (user_id: 159376ae-30e9-4997-b61f-76ab8d7f224b): email = 'visible', home_inbox = 'visible'
- Herman (user_id: fa92a4c6-890d-4d69-99a8-c3adc6c904ee): email = 'visible', home_inbox = 'visible'

### 2. Secrets: Added IONOS Passwords ✅
Added two new secrets:
- `SALMA_EMAIL_PASSWORD` - for salma@mortgagebolt.org
- `HERMAN_EMAIL_PASSWORD` - for herman@mortgagebolt.org

### 3. Edge Function: Updated `fetch-emails-imap/index.ts` ✅
Added Salma and Herman to the ACCOUNTS configuration with their respective password environment variables.

### 4. Frontend: Updated `src/pages/Email.tsx` ✅
- Updated account type to include 'salma' | 'herman'
- Updated unread counts state to track all 4 accounts
- Added "Salma Inbox" and "Herman Inbox" buttons to ACCOUNTS section
- Updated initial unread count fetch to include all 4 accounts

---

## Result

The Email page now shows 4 inboxes in the ACCOUNTS section:
- Yousif Inbox
- Scenarios Inbox  
- Salma Inbox
- Herman Inbox

Each inbox shows unread count badges and users can switch between any inbox to view/manage emails.
