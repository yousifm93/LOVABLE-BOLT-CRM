-- Update the log_field_changes function to use CRM user ID instead of auth user ID
CREATE OR REPLACE FUNCTION public.log_field_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid;
BEGIN
  -- Get CRM user ID using our helper function
  v_user := get_current_crm_user_id();
  
  -- Log loan_status changes
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'loan_status', OLD.loan_status::text, NEW.loan_status::text, v_user);
  END IF;
  
  -- Log appraisal_status changes
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'appraisal_status', OLD.appraisal_status::text, NEW.appraisal_status::text, v_user);
  END IF;
  
  -- Log title_status changes
  IF OLD.title_status IS DISTINCT FROM NEW.title_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'title_status', OLD.title_status::text, NEW.title_status::text, v_user);
  END IF;
  
  -- Log hoi_status changes
  IF OLD.hoi_status IS DISTINCT FROM NEW.hoi_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'hoi_status', OLD.hoi_status::text, NEW.hoi_status::text, v_user);
  END IF;
  
  -- Log condo_status changes
  IF OLD.condo_status IS DISTINCT FROM NEW.condo_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'condo_status', OLD.condo_status::text, NEW.condo_status::text, v_user);
  END IF;
  
  -- Log disclosure_status changes
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'disclosure_status', OLD.disclosure_status::text, NEW.disclosure_status::text, v_user);
  END IF;
  
  -- Log cd_status changes
  IF OLD.cd_status IS DISTINCT FROM NEW.cd_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'cd_status', OLD.cd_status::text, NEW.cd_status::text, v_user);
  END IF;
  
  -- Log package_status changes
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'package_status', OLD.package_status::text, NEW.package_status::text, v_user);
  END IF;
  
  -- Log epo_status changes
  IF OLD.epo_status IS DISTINCT FROM NEW.epo_status THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'epo_status', OLD.epo_status::text, NEW.epo_status::text, v_user);
  END IF;
  
  -- Log close_date changes
  IF OLD.close_date IS DISTINCT FROM NEW.close_date THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'close_date', OLD.close_date::text, NEW.close_date::text, v_user);
  END IF;
  
  -- Log lock_expiration_date changes
  IF OLD.lock_expiration_date IS DISTINCT FROM NEW.lock_expiration_date THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'lock_expiration_date', OLD.lock_expiration_date::text, NEW.lock_expiration_date::text, v_user);
  END IF;
  
  -- Log appr_date_time changes
  IF OLD.appr_date_time IS DISTINCT FROM NEW.appr_date_time THEN
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'appr_date_time', OLD.appr_date_time::text, NEW.appr_date_time::text, v_user);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update log_loan_status_change function for consistency
CREATE OR REPLACE FUNCTION public.log_loan_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid;
BEGIN
  -- Only log if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    v_user := get_current_crm_user_id();
    
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'loan_status', OLD.loan_status::text, NEW.loan_status::text, v_user);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;