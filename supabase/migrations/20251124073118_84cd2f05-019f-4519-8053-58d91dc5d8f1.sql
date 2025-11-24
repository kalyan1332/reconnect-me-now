-- Enable realtime on items table
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('match', 'new_item', 'message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  match_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create matches table for matching lost and found items
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(lost_item_id, found_item_id)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create matches"
  ON public.matches FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update matches"
  ON public.matches FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages they sent or received"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they received"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_matches_lost_item ON public.matches(lost_item_id);
CREATE INDEX idx_matches_found_item ON public.matches(found_item_id);
CREATE INDEX idx_messages_item ON public.messages(item_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);

-- Trigger for updating matches updated_at
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate match score between lost and found items
CREATE OR REPLACE FUNCTION calculate_match_score(
  lost_item_category TEXT,
  lost_item_location TEXT,
  lost_item_date DATE,
  found_item_category TEXT,
  found_item_location TEXT,
  found_item_date DATE
) RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Function to auto-create matches when items are inserted
CREATE OR REPLACE FUNCTION auto_create_matches()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's a lost item, find matching found items
  IF NEW.status = 'lost' THEN
    INSERT INTO public.matches (lost_item_id, found_item_id, match_score)
    SELECT 
      NEW.id,
      i.id,
      calculate_match_score(NEW.category, NEW.location, NEW.date::DATE, i.category, i.location, i.date::DATE)
    FROM public.items i
    WHERE i.status = 'found' 
      AND calculate_match_score(NEW.category, NEW.location, NEW.date::DATE, i.category, i.location, i.date::DATE) >= 30
    ON CONFLICT (lost_item_id, found_item_id) DO NOTHING;
  END IF;
  
  -- If it's a found item, find matching lost items
  IF NEW.status = 'found' THEN
    INSERT INTO public.matches (lost_item_id, found_item_id, match_score)
    SELECT 
      i.id,
      NEW.id,
      calculate_match_score(i.category, i.location, i.date::DATE, NEW.category, NEW.location, NEW.date::DATE)
    FROM public.items i
    WHERE i.status = 'lost' 
      AND calculate_match_score(i.category, i.location, i.date::DATE, NEW.category, NEW.location, NEW.date::DATE) >= 30
    ON CONFLICT (lost_item_id, found_item_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create matches
CREATE TRIGGER trigger_auto_create_matches
  AFTER INSERT ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_matches();