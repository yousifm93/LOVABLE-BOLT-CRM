-- Fix soft delete detection in dashboard_activity and dashboard_activity_details

-- Update dashboard_activity to treat soft deletes as deletes
DROP FUNCTION IF EXISTS public.dashboard_activity(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.dashboard_activity(_from timestamptz, _to timestamptz)
RETURNS TABLE(category text, action text, cnt bigint)
LANGUAGE sql
STABLE
AS $function$
  WITH categorized_actions AS (
    SELECT 
      category,
      CASE 
        -- Detect soft deletes in tasks table
        WHEN table_name = 'tasks' 
          AND action = 'update' 
          AND before_data->>'deleted_at' IS NULL 
          AND after_data->>'deleted_at' IS NOT NULL 
        THEN 'delete'
        ELSE action::text
      END as effective_action
    FROM audit_log
    WHERE changed_at >= _from AND changed_at < _to
  )
  SELECT category, effective_action as action, count(*)::bigint as cnt
  FROM categorized_actions
  GROUP BY category, effective_action
  ORDER BY category, effective_action;
$function$;

-- Update dashboard_activity_details to include effective_action
DROP FUNCTION IF EXISTS public.dashboard_activity_details(timestamptz, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.dashboard_activity_details(
  _from timestamptz,
  _to timestamptz,
  _category text,
  _action text DEFAULT NULL
)
RETURNS TABLE(
  item_id uuid,
  action text,
  table_name text,
  changed_at timestamptz,
  changed_by uuid,
  before_data jsonb,
  after_data jsonb,
  display_name text,
  fields_changed text[],
  user_first_name text,
  user_last_name text
)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH effective_actions AS (
    SELECT 
      a.*,
      CASE 
        -- Detect soft deletes in tasks table
        WHEN a.table_name = 'tasks' 
          AND a.action = 'update' 
          AND a.before_data->>'deleted_at' IS NULL 
          AND a.after_data->>'deleted_at' IS NOT NULL 
        THEN 'delete'
        ELSE a.action::text
      END as effective_action
    FROM audit_log a
    WHERE a.changed_at >= _from 
      AND a.changed_at < _to
      AND a.category = _category
      AND (_action IS NULL OR (
        CASE 
          WHEN a.table_name = 'tasks' 
            AND a.action = 'update' 
            AND a.before_data->>'deleted_at' IS NULL 
            AND a.after_data->>'deleted_at' IS NOT NULL 
          THEN 'delete'
          ELSE a.action::text
        END
      ) = _action)
  )
  SELECT 
    a.item_id,
    a.effective_action as action,
    a.table_name,
    a.changed_at,
    a.changed_by,
    a.before_data,
    a.after_data,
    CASE 
      -- Tasks: Show task title + borrower name
      WHEN a.table_name = 'tasks' THEN
        COALESCE(
          (a.after_data->>'title') || 
          CASE 
            WHEN a.after_data->>'borrower_id' IS NOT NULL THEN
              ' (' || (SELECT first_name || ' ' || last_name FROM leads WHERE id::text = a.after_data->>'borrower_id') || ')'
            ELSE ' (NBT)'
          END,
          (a.before_data->>'title') || 
          CASE 
            WHEN a.before_data->>'borrower_id' IS NOT NULL THEN
              ' (' || (SELECT first_name || ' ' || last_name FROM leads WHERE id::text = a.before_data->>'borrower_id') || ')'
            ELSE ' (NBT)'
          END,
          'Unknown Task'
        )
      -- Leads/Pipeline: Show borrower name
      WHEN a.table_name = 'leads' THEN
        COALESCE(
          (a.after_data->>'first_name') || ' ' || (a.after_data->>'last_name'),
          (a.before_data->>'first_name') || ' ' || (a.before_data->>'last_name'),
          'Unknown Lead'
        )
      -- Buyer Agents: Show agent name
      WHEN a.table_name = 'buyer_agents' THEN
        COALESCE(
          (a.after_data->>'first_name') || ' ' || (a.after_data->>'last_name'),
          (a.before_data->>'first_name') || ' ' || (a.after_data->>'last_name'),
          'Unknown Agent'
        )
      -- Lenders: Show lender name
      WHEN a.table_name = 'lenders' THEN
        COALESCE(
          (a.after_data->>'name'),
          (a.before_data->>'name'),
          'Unknown Lender'
        )
      -- Contacts: Show contact name
      WHEN a.table_name = 'contacts' THEN
        COALESCE(
          (a.after_data->>'first_name') || ' ' || (a.after_data->>'last_name'),
          (a.before_data->>'first_name') || ' ' || (a.before_data->>'last_name'),
          'Unknown Contact'
        )
      -- Lead Conditions: Show condition + borrower
      WHEN a.table_name = 'lead_conditions' THEN
        COALESCE(
          (a.after_data->>'description') || 
          ' (' || (SELECT first_name || ' ' || last_name FROM leads WHERE id::text = a.after_data->>'lead_id') || ')',
          (a.before_data->>'description') || 
          ' (' || (SELECT first_name || ' ' || last_name FROM leads WHERE id::text = a.before_data->>'lead_id') || ')',
          'Unknown Condition'
        )
      -- Call Logs: Show call + borrower
      WHEN a.table_name = 'call_logs' THEN
        'Call with ' || COALESCE(
          (SELECT first_name || ' ' || last_name FROM leads WHERE id::text = COALESCE(a.after_data->>'lead_id', a.before_data->>'lead_id')),
          'Unknown'
        )
      -- Email Logs: Show email + borrower
      WHEN a.table_name = 'email_logs' THEN
        'Email: ' || COALESCE(
          (a.after_data->>'subject'),
          (a.before_data->>'subject'),
          'No subject'
        ) || ' (' || COALESCE(
          (SELECT first_name || ' ' || last_name FROM leads WHERE id::text = COALESCE(a.after_data->>'lead_id', a.before_data->>'lead_id')),
          'Unknown'
        ) || ')'
      ELSE a.table_name
    END as display_name,
    -- Calculate fields changed (for updates) - exclude deleted_at from the count
    CASE 
      WHEN a.effective_action = 'update' AND a.before_data IS NOT NULL AND a.after_data IS NOT NULL THEN
        ARRAY(
          SELECT k.key
          FROM jsonb_object_keys(a.after_data) AS k(key)
          WHERE a.after_data->k.key IS DISTINCT FROM a.before_data->k.key
            AND k.key != 'deleted_at'
        )
      ELSE ARRAY[]::text[]
    END as fields_changed,
    u.first_name as user_first_name,
    u.last_name as user_last_name
  FROM effective_actions a
  LEFT JOIN users u ON u.id = a.changed_by
  ORDER BY a.changed_at DESC
  LIMIT 100;
END;
$function$;