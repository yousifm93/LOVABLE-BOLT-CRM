UPDATE pipeline_views 
SET column_order = '["name", "pendingAppOn", "status", "realEstateAgent", "user", "dueDate", "notes", "latestFileUpdates"]'::jsonb,
    column_widths = jsonb_build_object(
      'name', 76,
      'pendingAppOn', 58,
      'status', 72,
      'realEstateAgent', 77,
      'user', 72,
      'dueDate', 72,
      'notes', 396,
      'latestFileUpdates', 200
    )
WHERE id = '6ec7a7aa-51cf-4f1d-8941-bf3acafea116';