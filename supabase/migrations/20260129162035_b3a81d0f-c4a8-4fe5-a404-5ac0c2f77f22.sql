-- Step 1: Create the normalize_address function for improved matching
CREATE OR REPLACE FUNCTION public.normalize_address(addr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF addr IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Normalize to lowercase, trim, and standardize common abbreviations
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(
                        REGEXP_REPLACE(
                          REGEXP_REPLACE(addr,
                            ' (Drive|Dr)\.?( |$)', ' dr ', 'gi'),
                          ' (Avenue|Ave)\.?( |$)', ' ave ', 'gi'),
                        ' (Street|St)\.?( |$)', ' st ', 'gi'),
                      ' (Road|Rd)\.?( |$)', ' rd ', 'gi'),
                    ' (Boulevard|Blvd)\.?( |$)', ' blvd ', 'gi'),
                  ' (Court|Ct)\.?( |$)', ' ct ', 'gi'),
                ' (Plaza|Plz)\.?( |$)', ' plz ', 'gi'),
              ' (Lane|Ln)\.?( |$)', ' ln ', 'gi'),
            ' (Terrace|Ter)\.?( |$)', ' ter ', 'gi'),
          ' (Circle|Cir)\.?( |$)', ' cir ', 'gi'),
        ' (Way|Wy)\.?( |$)', ' way ', 'gi'),
      '[^a-zA-Z0-9 ]', '', 'g')
  ));
END;
$$;

-- Step 2: Update the trigger to use normalized address matching
CREATE OR REPLACE FUNCTION public.update_condo_past_closing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When a lead moves to Past Clients stage with an address
  IF NEW.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
     AND NEW.subject_address_1 IS NOT NULL THEN
    UPDATE condos SET past_mb_closing = true
    WHERE normalize_address(street_address) = normalize_address(NEW.subject_address_1)
      AND deleted_at IS NULL
      AND street_address IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 3: Add discovered addresses from online searches for condos missing them
UPDATE condos SET street_address = '1451 Brickell Ave' WHERE LOWER(condo_name) LIKE '%echo brickell%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '19707 Turnberry Way' WHERE LOWER(condo_name) LIKE '%turnberry isle north%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '19667 Turnberry Way' WHERE LOWER(condo_name) LIKE '%turnberry isle south%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '3400 NE 192nd St' WHERE LOWER(condo_name) LIKE '%mystic pointe%600%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '2901 NE 185th St' WHERE LOWER(condo_name) LIKE '%aventi%aventura%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '16901 Collins Ave' WHERE LOWER(condo_name) LIKE '%jade signature%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '18555 Collins Ave' WHERE LOWER(condo_name) LIKE '%porsche design%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '10203 Collins Ave' WHERE LOWER(condo_name) LIKE '%oceana bal harbour%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '15701 Collins Ave' WHERE LOWER(condo_name) LIKE '%ritz%carlton%sunny%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '18975 Collins Ave' WHERE LOWER(condo_name) LIKE '%armani%casa%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '1300 S Miami Ave' WHERE LOWER(condo_name) LIKE '%sls brickell%' AND street_address IS NULL AND deleted_at IS NULL;

-- Additional well-known buildings in Miami area
UPDATE condos SET street_address = '31 SE 5th St' WHERE LOWER(condo_name) LIKE '%brickell on the river%north%' OR LOWER(condo_name) LIKE '%brickle on the river north%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '1425 Brickell Ave' WHERE LOWER(condo_name) LIKE '%icon brickell%tower 1%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '485 Brickell Ave' WHERE LOWER(condo_name) LIKE '%icon brickell%tower 2%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '495 Brickell Ave' WHERE LOWER(condo_name) LIKE '%icon brickell%tower 3%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '480 NE 31st St' WHERE LOWER(condo_name) LIKE '%paraiso bay%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '600 NE 27th St' WHERE LOWER(condo_name) LIKE '%one paraiso%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '650 NE 32nd St' WHERE LOWER(condo_name) LIKE '%gran paraiso%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '400 Sunny Isles Blvd' WHERE LOWER(condo_name) LIKE '%trump tower%sunny%i%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '18001 Collins Ave' WHERE LOWER(condo_name) LIKE '%trump tower%ii%' AND street_address IS NULL AND deleted_at IS NULL;
UPDATE condos SET street_address = '15811 Collins Ave' WHERE LOWER(condo_name) LIKE '%trump tower%iii%' AND street_address IS NULL AND deleted_at IS NULL;

-- Step 4: Re-run the backfill with improved normalized matching
UPDATE condos SET past_mb_closing = true
WHERE id IN (
  SELECT DISTINCT c.id
  FROM condos c
  INNER JOIN leads l ON normalize_address(c.street_address) = normalize_address(l.subject_address_1)
  WHERE l.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
    AND l.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND c.street_address IS NOT NULL
    AND l.subject_address_1 IS NOT NULL
);