-- Update task_status enum to match requirements
ALTER TYPE task_status RENAME TO task_status_old;

CREATE TYPE task_status AS ENUM ('To Do', 'In Progress', 'Done');

-- Update the tasks table to use the new enum
ALTER TABLE tasks 
  ALTER COLUMN status TYPE task_status 
  USING CASE 
    WHEN status::text = 'Open' THEN 'To Do'::task_status
    WHEN status::text = 'Deferred' THEN 'To Do'::task_status  
    WHEN status::text = 'Done' THEN 'Done'::task_status
    ELSE 'To Do'::task_status
  END;

-- Drop the old enum
DROP TYPE task_status_old;