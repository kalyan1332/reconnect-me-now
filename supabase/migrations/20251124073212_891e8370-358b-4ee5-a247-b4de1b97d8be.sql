-- Fix search_path for calculate_match_score function
CREATE OR REPLACE FUNCTION calculate_match_score(
  lost_item_category TEXT,
  lost_item_location TEXT,
  lost_item_date DATE,
  found_item_category TEXT,
  found_item_location TEXT,
  found_item_date DATE
) RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Category match (50 points)
  IF lost_item_category = found_item_category THEN
    score := score + 50;
  END IF;
  
  -- Location similarity (30 points if exact, 15 if partial)
  IF lost_item_location = found_item_location THEN
    score := score + 30;
  ELSIF lost_item_location ILIKE '%' || found_item_location || '%' OR found_item_location ILIKE '%' || lost_item_location || '%' THEN
    score := score + 15;
  END IF;
  
  -- Date proximity (20 points max, decreasing with days apart)
  IF ABS(EXTRACT(DAY FROM (lost_item_date - found_item_date))) <= 7 THEN
    score := score + (20 - ABS(EXTRACT(DAY FROM (lost_item_date - found_item_date))) * 2);
  END IF;
  
  RETURN score;
END;
$$;