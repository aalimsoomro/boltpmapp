/*
  # Create Default Project and Assign Admin Role

  This migration performs the following actions:
  1. Creates a default project named "Default Admin Project" if it does not already exist. This project serves as a placeholder for initial admin role assignment.
  2. Creates a temporary `get_user_id_by_email` function (with `SECURITY DEFINER`) to safely retrieve a user's UUID from the `auth.users` table based on their email. This is necessary because `auth.users` is a protected table.
  3. Inserts an 'Admin' role for the user `aalim.soomro@gmail.com` for the "Default Admin Project" in the `project_user_roles` table. This operation is conditional: it only proceeds if the user exists and the role has not already been assigned for that project.
  4. Drops the temporary `get_user_id_by_email` function to maintain security.

  IMPORTANT NOTE:
  The user with email `aalim.soomro@gmail.com` MUST sign up through the application's authentication page BEFORE this migration is applied. If the user does not exist in `auth.users`, the role assignment will fail.

  1. New Tables
    - No new tables, but potentially a new row in `projects` and `project_user_roles`.
  2. Security
    - Temporarily creates a `SECURITY DEFINER` function for internal use during migration.
    - Assigns 'Admin' role to a specific user for a specific project.
  3. Changes
    - Adds a default project.
    - Adds an admin role for `aalim.soomro@gmail.com` to the default project.
*/

-- 1. Create a default project if it doesn't exist
DO $$
DECLARE
  default_project_id uuid;
BEGIN
  SELECT id INTO default_project_id FROM projects WHERE name = 'Default Admin Project';

  IF default_project_id IS NULL THEN
    INSERT INTO projects (name) VALUES ('Default Admin Project') RETURNING id INTO default_project_id;
  END IF;
END $$;

-- 2. Create a temporary function to get user ID by email
-- This function is SECURITY DEFINER to allow access to auth.users table
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
  RETURN user_uuid;
END;
$$;

-- 3. Assign 'Admin' role to the specified user for the default project
DO $$
DECLARE
  admin_user_id uuid;
  default_project_id uuid;
BEGIN
  -- Get the user ID for the admin email
  admin_user_id := get_user_id_by_email('aalim.soomro@gmail.com');

  -- Get the ID of the default project
  SELECT id INTO default_project_id FROM projects WHERE name = 'Default Admin Project';

  -- Insert the admin role if the user exists and the role doesn't already exist for this project
  IF admin_user_id IS NOT NULL AND default_project_id IS NOT NULL THEN
    INSERT INTO project_user_roles (project_id, user_id, role)
    VALUES (default_project_id, admin_user_id, 'Admin')
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'Admin';
  END IF;
END $$;

-- 4. Drop the temporary function
DROP FUNCTION IF EXISTS get_user_id_by_email(text);
