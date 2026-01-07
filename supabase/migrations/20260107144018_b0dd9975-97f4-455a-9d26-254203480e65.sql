-- Drop the redundant CTC-specific trigger that causes duplicate task creation
-- The execute_loan_status_changed_automations trigger already handles all loan_status changes including CTC

DROP TRIGGER IF EXISTS tr_loan_status_ctc_automation ON leads;
DROP FUNCTION IF EXISTS execute_loan_status_ctc_changed_automations();