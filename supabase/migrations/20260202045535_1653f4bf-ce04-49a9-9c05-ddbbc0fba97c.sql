-- Update generate_room_credentials to use relative path instead of hardcoded domain
CREATE OR REPLACE FUNCTION public.generate_room_credentials()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.room_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
    NEW.room_password := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    -- Use relative path to work with any domain
    NEW.invite_link := '/join/' || NEW.room_id;
    RETURN NEW;
END;
$function$;