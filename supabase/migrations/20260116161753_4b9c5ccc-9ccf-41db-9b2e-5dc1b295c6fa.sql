-- Clear face_to_face_meeting for agents who should only have broker opens
UPDATE buyer_agents 
SET face_to_face_meeting = NULL 
WHERE id IN (
  'd911447d-e769-439e-ad99-daf557c2a2ee',
  'b4654479-0e3f-4414-ae9b-bfda79c58f49',
  'c7ffae5d-a781-453f-8617-a05536446871'
);