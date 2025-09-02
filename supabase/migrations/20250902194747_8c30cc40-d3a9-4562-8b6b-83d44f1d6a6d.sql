-- Update team_assignments table to support new role names
DO $$ 
BEGIN
    -- Update existing role names to new ones
    UPDATE team_assignments 
    SET role = CASE 
        WHEN role = 'loa1' THEN 'pre_approval_expert'
        WHEN role = 'loa2' THEN 'account_executive' 
        WHEN role = 'underwriting1' THEN 'lender'
        ELSE role 
    END
    WHERE role IN ('loa1', 'loa2', 'underwriting1');
END $$;