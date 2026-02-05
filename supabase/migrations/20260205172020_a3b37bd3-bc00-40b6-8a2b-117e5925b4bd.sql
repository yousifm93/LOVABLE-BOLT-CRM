-- Step 1: Reassign tasks.assignee_id from Juan Diego to Yousif Mohamed
UPDATE tasks 
SET assignee_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE assignee_id = '31e7f1ae-8021-4214-841e-c7d440789fe3';

-- Step 2: Reassign tasks.created_by from Juan Diego to Yousif Mohamed
UPDATE tasks 
SET created_by = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE created_by = '31e7f1ae-8021-4214-841e-c7d440789fe3';

-- Step 3: Reassign task_assignees from Juan Diego to Yousif Mohamed
UPDATE task_assignees 
SET user_id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE user_id = '31e7f1ae-8021-4214-841e-c7d440789fe3';

-- Step 4: Reassign leads where Juan Diego is the teammate
UPDATE leads 
SET teammate_assigned = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'
WHERE teammate_assigned = '31e7f1ae-8021-4214-841e-c7d440789fe3';

-- Step 5: Delete Juan Diego's user record
DELETE FROM users 
WHERE id = '31e7f1ae-8021-4214-841e-c7d440789fe3';