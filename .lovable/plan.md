# User Management & Processor Role Updates

## Status: ✅ Code Complete

### Completed Changes

1. **User Management Page** (`src/pages/UserManagement.tsx`)
   - ✅ Added separate "Inactive" section for deactivated users
   - ✅ Users are now filtered into three groups: Admins (active), Team Members (active), Inactive (all roles)
   - ✅ Inactive section shows with reduced opacity and "Reactivate" button

2. **Sidebar Group-Level Filtering** (`src/components/AppSidebar.tsx`)
   - ✅ Added `hasAnyVisibleItems()` helper function
   - ✅ All sidebar groups (Pipeline, Contacts, Resources, Calculators, Admin) now check if any child items are visible before rendering
   - ✅ Empty groups are completely removed from sidebar, not just collapsed

---

## Remaining: SQL Update for Processor Role

To make Ashley's sidebar show only Home, Tasks, Email, Active, and Feedback, run this SQL in Supabase:

```sql
UPDATE user_permissions 
SET 
  dashboard = 'hidden',
  pipeline_leads = 'hidden',
  pipeline_pending_app = 'hidden',
  pipeline_screening = 'hidden',
  pipeline_pre_qualified = 'hidden',
  pipeline_pre_approved = 'hidden',
  pipeline_past_clients = 'hidden',
  pipeline_idle = 'hidden',
  contacts = 'hidden',
  contacts_agents = 'hidden',
  contacts_borrowers = 'hidden',
  contacts_lenders = 'hidden',
  resources = 'hidden',
  resources_bolt_bot = 'hidden',
  resources_email_marketing = 'hidden',
  resources_condolist = 'hidden',
  resources_preapproval = 'hidden',
  calculators = 'hidden',
  calculators_loan_pricer = 'hidden',
  calculators_property_value = 'hidden',
  calculators_income = 'hidden',
  calculators_estimate = 'hidden',
  admin = 'hidden'
WHERE user_id = (SELECT id FROM users WHERE first_name = 'Ashley' AND role = 'Processor');
```

This will make all sections except Home, Tasks, Email, Active pipeline, and Feedback completely invisible for Processors.

