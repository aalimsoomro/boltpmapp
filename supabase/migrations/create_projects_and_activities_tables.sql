/*
  # Create projects and activities tables

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `start_date` (date)
      - `end_date` (date)
      - `vendor` (text)
      - `description` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to auth.users.id)
    - `activities`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects.id, not null)
      - `name` (text, not null)
      - `quantity` (numeric, default 0)
      - `unit` (text)
      - `rate` (numeric, default 0)
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `projects` table
    - Enable RLS on `activities` table
    - Add policies for authenticated users to create, read, update, and delete their own projects and associated activities.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date,
  end_date date,
  vendor text,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can view their own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update their own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete their own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);


CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity numeric DEFAULT 0,
  unit text,
  rate numeric DEFAULT 0,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policies for activities should check if the associated project belongs to the user
CREATE POLICY "Authenticated users can create activities for their projects"
  ON activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = activities.project_id AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can view activities for their projects"
  ON activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = activities.project_id AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update activities for their projects"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = activities.project_id AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can delete activities for their projects"
  ON activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM projects
      WHERE projects.id = activities.project_id AND projects.created_by = auth.uid()
    )
  );
