-- Drop the existing function
DROP FUNCTION IF EXISTS public.dashboard_activity_details(timestamptz, timestamptz, text, text);

-- Recreate the function with fixed fields_changed calculation
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
  SELECT 
    a.item_id,
    a.action::text,
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
          (a.before_data->>'first_name') || ' ' || (a.before_data->>'last_name'),
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
    -- Calculate fields changed (for updates)
    CASE 
      WHEN a.action = 'update' AND a.before_data IS NOT NULL AND a.after_data IS NOT NULL THEN
        ARRAY(
          SELECT jsonb_object_keys(a.after_data)
          WHERE a.after_data->jsonb_object_keys(a.after_data) IS DISTINCT FROM a.before_data->jsonb_object_keys(a.after_data)
        )
      ELSE ARRAY[]::text[]
    END as fields_changed,
    u.first_name as user_first_name,
    u.last_name as user_last_name
  FROM audit_log a
  LEFT JOIN users u ON u.id = a.changed_by
  WHERE a.changed_at >= _from 
    AND a.changed_at < _to
    AND a.category = _category
    AND (_action IS NULL OR a.action::text = _action)
  ORDER BY a.changed_at DESC
  LIMIT 100;
END;
$function$;