-- Add missing UPDATE and DELETE policies for items table

-- Allow authenticated users to update items
CREATE POLICY "Authenticated users can update items"
ON public.items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete items  
CREATE POLICY "Authenticated users can delete items"
ON public.items
FOR DELETE
TO authenticated
USING (true);