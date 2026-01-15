-- Clear broker_open for agents whose broker_open log was deleted
UPDATE buyer_agents 
SET broker_open = NULL 
WHERE broker_open IS NOT NULL 
AND id NOT IN (
  SELECT DISTINCT agent_id 
  FROM agent_call_logs 
  WHERE log_type = 'broker_open' 
  AND agent_id IS NOT NULL
);

-- Also clear face_to_face_meeting for agents whose meeting log was deleted
UPDATE buyer_agents 
SET face_to_face_meeting = NULL 
WHERE face_to_face_meeting IS NOT NULL 
AND id NOT IN (
  SELECT DISTINCT agent_id 
  FROM agent_call_logs 
  WHERE log_type = 'meeting' 
  AND agent_id IS NOT NULL
);