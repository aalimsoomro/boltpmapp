/*
  # Initial PMApp Schema

  This migration sets up the initial database schema for the PMApp project.

  1. New Tables
    - `users`: Stores additional user profile information linked to auth.users.
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, user's full name)
      - `email` (text, unique, user's email)
      - `role` (text, user's role: 'pending', 'admin', 'manager', 'vendor', 'employee')
      - `approved` (boolean, indicates if admin has approved the user)
      - `created_at` (timestamp)
    - `projects`: Stores project metadata.
      - `id` (uuid, primary key)
      - `name` (text, project name)
      - `description` (text, project description)
      - `start_date` (date, project start date)
      - `end_date` (date, project end date)
      - `vendor` (text, project vendor - could be foreign key to vendors table)
      - `status` (text, project status: 'ongoing', 'completed', 'delayed')
      - `completion_percentage` (numeric, project completion percentage)
      - `user_id` (uuid, foreign key to users table, creator of the project)
      - `created_at` (timestamp)
    - `activities`: Stores activities associated with projects.
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects table)
      - `name` (text, activity name)
      - `quantity` (numeric, activity quantity)
      - `unit` (text, unit of measurement)
      - `rate` (numeric, rate per unit)
      - `start_date` (date, activity start date)
      - `end_date` (date, activity end date)
      - `status` (text, activity status - e.g., 'not started', 'in progress', 'completed')
      - `assigned_to` (uuid, foreign key to users table, user assigned to activity)
      - `created_at` (timestamp)
    - `vendors`: Stores vendor information.
      - `id` (uuid, primary key)
      - `name` (text, vendor name)
      - `contact_info` (text, vendor contact details)
      - `created_at` (timestamp)
    - `files`: Stores metadata for uploaded files.
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects table)
      - `activity_id` (uuid, foreign key to activities table, optional)
      - `user_id` (uuid, foreign key to users table, uploader)
      - `name` (text, file name)
      - `url` (text, URL to the file in Supabase Storage)
      - `uploaded_at` (timestamp)
    - `comments`: Stores comments on activities or projects.
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects table)
      - `activity_id` (uuid, foreign key to activities table, optional)
      - `user_id` (uuid, foreign key to users table, commenter)
      - `content` (text, comment content)
      - `parent_comment_id` (uuid, foreign key to comments table, for threading, optional)
      - `created_at` (timestamp)
    - `notifications`: Stores in-app notifications for users.
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users table, recipient)
      - `message` (text, notification message)
      - `link` (text, optional link to related resource)
      - `read` (boolean, indicates if the user has read the notification)
      - `created_at` (timestamp)
    - `settings`: Stores global application settings (Admin only).
      - `id` (text, primary key, e.g., 'global_settings')
      - `allowed_file_types` (text, comma-separated list)
      - `project_types` (jsonb, array of strings)
      - `vendor_list` (jsonb, array of strings)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all new tables.
    - Add basic RLS policies (these will need refinement based on roles).

  3. Changes
    - Initial schema creation.
*/

-- Create the 'users' table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name text,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'pending'::text NOT NULL,
  approved boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for 'users' table
CREATE POLICY "Authenticated users can view their own user record"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all user records"
  ON public.users FOR SELECT
  TO authenticated -- Assuming admin role is checked in application logic or a more complex RLS policy
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can update their own user record"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any user record"
  ON public.users FOR UPDATE
  TO authenticated -- Assuming admin role check
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Create the 'projects' table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  vendor text, -- Consider making this a foreign key to a vendors table
  status text DEFAULT 'ongoing'::text NOT NULL, -- e.g., 'ongoing', 'completed', 'delayed'
  completion_percentage numeric DEFAULT 0 NOT NULL,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL, -- Creator of the project
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies for 'projects' table
CREATE POLICY "Authenticated users can view projects they are involved in or if they are admin/manager"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')) -- Admins/Managers can see all
    OR user_id = auth.uid() -- Creator can see their projects
    -- TODO: Add conditions for vendors/employees to see assigned projects
  );

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()); -- Ensure user creating the project is the logged-in user

CREATE POLICY "Authenticated users can update projects they created or if they are admin/manager"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    OR user_id = auth.uid()
  );

-- Create the 'activities' table
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric DEFAULT 0 NOT NULL,
  unit text,
  rate numeric DEFAULT 0 NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'not started'::text NOT NULL, -- e.g., 'not started', 'in progress', 'completed'
  assigned_to uuid REFERENCES public.users (id) ON DELETE SET NULL, -- User assigned to this activity
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Policies for 'activities' table
CREATE POLICY "Authenticated users can view activities for projects they can view"
  ON public.activities FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    OR user_id = auth.uid()
    -- TODO: Add conditions for vendors/employees to see activities for assigned projects/activities
  )));

CREATE POLICY "Authenticated users can insert activities for projects they can edit"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    OR user_id = auth.uid()
  )));

CREATE POLICY "Authenticated users can update activities for projects they can edit or if assigned"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
    ))
    OR assigned_to = auth.uid() -- Assigned user can update their activity status/details
  );

-- Create the 'vendors' table
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  contact_info text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Policies for 'vendors' table
CREATE POLICY "Authenticated users can view vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (true); -- Adjust based on who should see vendors

CREATE POLICY "Admins can manage vendors"
  ON public.vendors FOR ALL -- INSERT, UPDATE, DELETE
  TO authenticated -- Assuming admin role check
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


-- Create the 'files' table
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities (id) ON DELETE SET NULL, -- Optional link to activity
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL, -- Uploader
  name text NOT NULL,
  url text NOT NULL, -- URL in Supabase Storage
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Policies for 'files' table
CREATE POLICY "Authenticated users can view files for projects they can view"
  ON public.files FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    OR user_id = auth.uid()
    -- TODO: Add conditions for vendors/employees
  )));

CREATE POLICY "Authenticated users can upload files for projects they can edit"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    OR user_id = auth.uid()
  )));

CREATE POLICY "Authenticated users can delete files they uploaded or if they are admin/manager"
  ON public.files FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
  );


-- Create the 'comments' table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.activities (id) ON DELETE CASCADE, -- Link to activity or project
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL, -- Commenter
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.comments (id) ON DELETE CASCADE, -- For threading
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies for 'comments' table
CREATE POLICY "Authenticated users can view comments for projects/activities they can view"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
      -- TODO: Add conditions for vendors/employees
    ))
    OR EXISTS (SELECT 1 FROM public.activities WHERE id = activity_id AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
      -- TODO: Add conditions for vendors/employees
    )))
  );

CREATE POLICY "Authenticated users can insert comments for projects/activities they can view"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
      -- TODO: Add conditions for vendors/employees
    ))
    OR EXISTS (SELECT 1 FROM public.activities WHERE id = activity_id AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
      -- TODO: Add conditions for vendors/employees
    )))
  ));

CREATE POLICY "Authenticated users can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can delete their own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- Create the 'notifications' table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE CASCADE, -- Recipient
  message text NOT NULL,
  link text, -- Optional link
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for 'notifications' table
CREATE POLICY "Authenticated users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow any authenticated user/system process to create notifications (e.g., triggered by activity updates)

CREATE POLICY "Authenticated users can update their own notifications (e.g., mark as read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());


-- Create the 'settings' table (assuming a single row for global settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id text PRIMARY KEY, -- Use a fixed ID like 'global_settings'
  allowed_file_types text,
  project_types jsonb, -- Store as JSON array of strings
  vendor_list jsonb, -- Store as JSON array of strings
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for 'settings' table
CREATE POLICY "Admins can view settings"
  ON public.settings FOR SELECT
  TO authenticated -- Assuming admin role check
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  TO authenticated -- Assuming admin role check
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert settings"
  ON public.settings FOR INSERT
  TO authenticated -- Assuming admin role check
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));


-- Optional: Add triggers to update `updated_at` column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to settings table
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Set up Supabase Storage Bucket for project files
-- In Supabase UI -> Storage -> Create a new bucket named 'project-files'
-- Set up RLS policies for the storage bucket:
-- Policy 1: Allow authenticated users to upload files (if they can edit the project)
-- Policy 2: Allow authenticated users to view files (if they can view the project)
-- Policy 3: Allow authenticated users to delete files (if they uploaded or are admin/manager)

/*
Example Storage Policy for 'project-files' bucket (SQL Editor):

-- Allow authenticated users to upload files if they are associated with a project they can edit
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = (string_to_array(name, '/'))[1]::uuid -- Assuming path is like 'project_id/filename'
    AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
    )
  )
);

-- Allow authenticated users to view files if they can view the associated project
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = (string_to_array(name, '/'))[1]::uuid -- Assuming path is like 'project_id/filename'
    AND (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
      OR user_id = auth.uid()
      -- TODO: Add conditions for vendors/employees
    )
  )
);

-- Allow authenticated users to delete files they uploaded or if they are admin/manager
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND EXISTS (
    SELECT 1 FROM public.files -- Join with your files table to check uploader
    WHERE url LIKE '%' || objects.name -- Match storage object name with file URL/path
    AND (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
    )
  )
);
*/
