ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_type_check;

ALTER TABLE requests
ADD CONSTRAINT requests_type_check
CHECK (type IN (
  'ADD_PERSON',
  'ADD_NEWBORN',
  'UPDATE_PERSON',
  'REMOVE_PERSON',
  'CHANGE_HEAD',
  'UPDATE_HOUSEHOLD',
  'SPLIT_HOUSEHOLD',
  'TEMPORARY_RESIDENCE',
  'TEMPORARY_ABSENCE',
  'TAM_TRU',           -- Tạm trú
  'TAM_VANG',          -- Tạm vắng
  'MOVE_OUT',
  'DECEASED'
));

CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);






