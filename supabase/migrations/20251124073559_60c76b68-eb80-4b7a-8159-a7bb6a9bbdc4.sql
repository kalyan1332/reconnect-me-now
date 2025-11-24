-- Add user_id to items table to properly link items to users
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update items table RLS policies to use user_id
DROP POLICY IF EXISTS "Authenticated users can delete items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can update items" ON public.items;

CREATE POLICY "Users can delete their own items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a function to notify users about new matches
CREATE OR REPLACE FUNCTION notify_match_created()
RETURNS TRIGGER AS $$
DECLARE
  lost_item_user_id UUID;
  found_item_user_id UUID;
  lost_item_title TEXT;
BEGIN
  -- Get the user_id and title from the lost item
  SELECT user_id, title INTO lost_item_user_id, lost_item_title
  FROM public.items
  WHERE id = NEW.lost_item_id;
  
  -- Get the user_id from the found item
  SELECT user_id INTO found_item_user_id
  FROM public.items
  WHERE id = NEW.found_item_id;
  
  -- Create notification for lost item owner
  IF lost_item_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, item_id, match_id)
    VALUES (
      lost_item_user_id,
      'match',
      'New Match Found! 🎉',
      'We found a potential match for "' || lost_item_title || '". Match score: ' || NEW.match_score || '%',
      NEW.lost_item_id,
      NEW.id
    );
  END IF;
  
  -- Create notification for found item owner
  IF found_item_user_id IS NOT NULL AND found_item_user_id != lost_item_user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, item_id, match_id)
    VALUES (
      found_item_user_id,
      'match',
      'Your found item matches a lost report! 🎉',
      'Your found item has been matched with a lost report. Match score: ' || NEW.match_score || '%',
      NEW.found_item_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to notify about matches
CREATE TRIGGER trigger_notify_match_created
  AFTER INSERT ON public.matches
  FOR EACH ROW
  WHEN (NEW.match_score >= 50)
  EXECUTE FUNCTION notify_match_created();

-- Function to notify users about new items in their area
CREATE OR REPLACE FUNCTION notify_new_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for all other users about this new item
  -- In production, you'd want to filter by location proximity
  INSERT INTO public.notifications (user_id, type, title, message, item_id)
  SELECT 
    u.id,
    'new_item',
    CASE 
      WHEN NEW.status = 'lost' THEN 'New Lost Item Reported 📢'
      ELSE 'New Found Item Reported 🎉'
    END,
    'A ' || NEW.category || ' was ' || NEW.status || ' near ' || NEW.location,
    NEW.id
  FROM auth.users u
  WHERE u.id != NEW.user_id
    AND u.id IN (SELECT user_id FROM public.profiles)
  LIMIT 50; -- Limit to avoid spamming
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to notify about new items (optional, can be disabled if too noisy)
-- CREATE TRIGGER trigger_notify_new_item
--   AFTER INSERT ON public.items
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_new_item();