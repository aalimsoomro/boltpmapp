/*
      # Initial Schema for PMApp

      This migration creates the core tables for the project management application:
      - `vendors`: Stores information about vendors.
      - `projects`: Stores project details.
      - `activities`: Stores activities associated with projects.
      - `files`: Stores file metadata linked to projects or activities.
      - `comments`: Stores comments linked to projects or activities.
      - `project_user_roles`: Links users to projects with specific roles.

      1. New Tables
        - `vendors`
          - `id` (uuid, primary key)
          - `name` (text, unique, not null)
          - `contact_email` (text)
          - `created_at` (timestamptz)
        - `projects`
          - `id` (uuid, primary key)
          - `name` (text, not null)
          - `start_date` (date)
          - `end_date` (date)
          - `completion_percentage` (numeric, default 0)
          - `created_at` (timestamptz)
        - `activities`
          - `id` (uuid, primary key)
          - `project_id` (uuid, foreign key to projects, not null)
          - `vendor_id` (uuid, foreign key to vendors)
          - `name` (text, not null)
          - `start_date` (date)
          - `end_date` (date)
          - `quantity` (numeric)
          - `unit` (text)
          - `rate` (numeric)
          - `status` (text, default 'Not Started')
          - `created_at` (timestamptz)
        - `files`
          - `id` (uuid, primary key)
          - `project_id` (uuid, foreign key to projects)
          - `activity_id` (uuid, foreign key to activities)
          - `user_id` (uuid, foreign key to auth.users, not null)
          - `file_path` (text, not null)
          - `file_name` (text, not null)
          - `mime_type` (text)
          - `size` (bigint)
          - `created_at` (timestamptz)
        - `comments`
          - `id` (uuid, primary key)
          - `project_id` (uuid, foreign key to projects)
          - `activity_id` (uuid, foreign key to activities)
          - `user_id` (uuid, foreign key to auth.users, not null)
          - `content` (text, not null)
          - `created_at` (timestamptz)
        - `project_user_roles`
          - `id` (uuid, primary key)
          - `project_id` (uuid, foreign key to projects, not null)
          - `user_id` (uuid, foreign key to auth.users, not null)
          - `role` (text, not null) -- e.g., 'Admin', 'Manager', 'Vendor', 'Employee'
          - `created_at` (timestamptz)

      2. Security
        - Enable RLS on all new tables.
        - Add basic RLS policies (will be refined later based on roles).

      3. Changes
        - Reordered SQL statements to create all tables first, then enable RLS, then create policies, ensuring tables referenced by policies exist before the policies are defined.
    */

    -- Create tables first
    CREATE TABLE IF NOT EXISTS vendors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL,
      contact_email text,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      start_date date,
      end_date date,
      completion_percentage numeric DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS activities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
      name text NOT NULL,
      start_date date,
      end_date date,
      quantity numeric,
      unit text,
      rate numeric,
      status text DEFAULT 'Not Started', -- e.g., 'Not Started', 'In Progress', 'Completed', 'Delayed'
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
      activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      file_path text NOT NULL,
      file_name text NOT NULL,
      mime_type text,
      size bigint,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
      activity_id uuid REFERENCES activities(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS project_user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role text NOT NULL, -- 'Admin', 'Manager', 'Vendor', 'Employee'
      created_at timestamptz DEFAULT now(),
      UNIQUE (project_id, user_id) -- Ensure a user has only one role per project
    );

    -- Enable RLS on all tables
    ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE files ENABLE ROW LEVEL SECURITY;
    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE project_user_roles ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Allow authenticated read access to vendors"
      ON vendors FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow admin insert/update/delete on vendors"
      ON vendors FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM project_user_roles pur WHERE pur.user_id = auth.uid() AND pur.role = 'Admin'));

    CREATE POLICY "Allow authenticated read access to projects"
      ON projects FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow admin insert/update/delete on projects"
      ON projects FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM project_user_roles pur WHERE pur.user_id = auth.uid() AND pur.role = 'Admin'));

    CREATE POLICY "Allow authenticated read access to activities"
      ON activities FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow admin insert/update/delete on activities"
      ON activities FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM project_user_roles pur WHERE pur.user_id = auth.uid() AND pur.role = 'Admin'));

    CREATE POLICY "Allow authenticated users to manage their own files"
      ON files FOR ALL TO authenticated USING (auth.uid() = user_id);

    CREATE POLICY "Allow authenticated users to manage their own comments"
      ON comments FOR ALL TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "Allow authenticated users to read comments"
      ON comments FOR SELECT TO authenticated USING (true);

    CREATE POLICY "Allow authenticated read access to project user roles"
      ON project_user_roles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Allow admin insert/update/delete on project user roles"
      ON project_user_roles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM project_user_roles pur WHERE pur.user_id = auth.uid() AND pur.role = 'Admin'));
