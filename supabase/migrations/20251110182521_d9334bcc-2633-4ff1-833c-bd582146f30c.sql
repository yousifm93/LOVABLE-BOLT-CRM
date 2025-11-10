-- Add face_to_face_meeting column to buyer_agents table
ALTER TABLE buyer_agents 
ADD COLUMN face_to_face_meeting timestamp with time zone;

-- Add index for better query performance
CREATE INDEX idx_buyer_agents_face_to_face_meeting 
ON buyer_agents(face_to_face_meeting) 
WHERE face_to_face_meeting IS NOT NULL;