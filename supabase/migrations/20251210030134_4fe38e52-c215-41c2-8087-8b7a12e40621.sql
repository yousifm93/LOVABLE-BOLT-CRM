-- Delete tasks due before December 5th, 2025
DELETE FROM tasks WHERE due_date < '2025-12-05';