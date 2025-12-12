-- Reset stuck documents to pending so they can be reprocessed
UPDATE income_documents SET ocr_status = 'pending' WHERE ocr_status = 'processing';