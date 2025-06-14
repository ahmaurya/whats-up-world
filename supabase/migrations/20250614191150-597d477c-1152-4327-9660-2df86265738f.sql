
-- Phase 1: Critical Database Security Fixes

-- Add missing DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile" 
  ON public.profiles 
  FOR DELETE 
  USING (auth.uid() = id);

-- Add input validation function for profiles
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Sanitize and validate email
  IF NEW.email IS NOT NULL THEN
    NEW.email = TRIM(LOWER(NEW.email));
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;
  
  -- Sanitize and validate full_name
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name = TRIM(NEW.full_name);
    IF LENGTH(NEW.full_name) > 100 THEN
      RAISE EXCEPTION 'Full name too long (max 100 characters)';
    END IF;
    IF NEW.full_name ~ '[<>"\''&]' THEN
      RAISE EXCEPTION 'Full name contains invalid characters';
    END IF;
  END IF;
  
  -- Validate avatar_url
  IF NEW.avatar_url IS NOT NULL THEN
    NEW.avatar_url = TRIM(NEW.avatar_url);
    IF LENGTH(NEW.avatar_url) > 500 THEN
      RAISE EXCEPTION 'Avatar URL too long (max 500 characters)';
    END IF;
    IF NEW.avatar_url !~ '^https?://' THEN
      RAISE EXCEPTION 'Avatar URL must be a valid HTTP/HTTPS URL';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile validation
CREATE TRIGGER validate_profile_data_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_data();
