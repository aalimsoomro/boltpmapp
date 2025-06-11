import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useParams, Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  vendor: string;
  start_date: string;
  end_date: string;
  description: string;
  status: 'ongoing' | 'completed' | 'delayed';
  completion_percentage: number;
  activities: Activity[]; // Assuming activities are joined or fetched separately
  files: ProjectFile[]; // Assuming files are joined or fetched separately
  comments: Comment[]; // Assuming comments are joined or fetched separately
}

interface Activity {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  start_date?: string;
  end_date?: string;
  project_id: string;
  // Add other activity fields like status, assigned_to etc.
}

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  uploaded_at: string;
  // Add other file fields
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string; // ID of the user who commented
  // Add other comment fields like parent_comment_id for threading
}


export default function ProjectDetail() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!authLoading && user && id) {
      fetchProjectDetails(id);
    }
  }, [user, authLoading, id]);

  const fetchProjectDetails = async (projectId: string) => {
    setLoading(true);
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*') // Select all project fields
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch related activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId);

      if (activitiesError) throw activitiesError;

      // Fetch related files
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId);

      if (filesError) throw filesError;

      // Fetch related comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }); // Order comments chronologically

      if (commentsError) throw commentsError;


      setProject({
        ...projectData,
        activities: activitiesData || [],
        files: filesData || [],
        comments: commentsData || [],
      });
      setLoading(false);

    } catch (error: any) {
      console.error('Error fetching project details:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load project details.',
      });
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading project...</div>;
  }

  if (!project) {
    return <div className="flex items-center justify-center min-h-screen">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
        <Button onClick={() => navigate(`/projects/${project.id}/edit`)}>Edit Project</Button>
      </div>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4"> {/* Adjust grid-cols based on number of tabs */}
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Vendor:</strong> {project.vendor}</p>
                  <p><strong>Start Date:</strong> {project.start_date}</p>
                  <p><strong>End Date:</strong> {project.end_date}</p>
                  <p><strong>Status:</strong> {project.status}</p>
                  <p><strong>Completion:</strong> {project.completion_percentage || 0}%</p>
                </div>
                <div>
                  <p><strong>Description:</strong></p>
                  <p>{project.description || 'No description provided.'}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activities" className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Activities</h3>
              {/* TODO: Implement Gantt Chart here */}
              {/* Placeholder for Activity List */}
              {project.activities.length === 0 ? (
                <p>No activities found for this project.</p>
              ) : (
                <ul className="space-y-2">
                  {project.activities.map(activity => (
                    <li key={activity.id} className="border-b pb-2 last:border-b-0">
                      <strong>{activity.name}</strong> (Qty: {activity.quantity}, Unit: {activity.unit}, Rate: {activity.rate})
                       {activity.start_date && activity.end_date && (
                         <span> | {activity.start_date} to {activity.end_date}</span>
                       )}
                      {/* Add more activity details */}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Files</h3>
              {/* TODO: Implement File Upload Component */}
              {/* Placeholder for File List */}
               {project.files.length === 0 ? (
                 <p>No files uploaded for this project.</p>
               ) : (
                 <ul className="space-y-2">
                   {project.files.map(file => (
                     <li key={file.id} className="border-b pb-2 last:border-b-0 flex justify-between items-center">
                       <span>{file.name}</span>
                       <div>
                         <Button variant="link" className="p-0 h-auto mr-2" onClick={() => window.open(file.url, '_blank')}>Download</Button>
                         {/* Add Delete Button (with permission check) */}
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Comments</h3>
              {/* TODO: Implement Add Comment Form */}
              {/* Placeholder for Comments List */}
               {project.comments.length === 0 ? (
                 <p>No comments yet.</p>
               ) : (
                 <div className="space-y-4">
                   {project.comments.map(comment => (
                     <div key={comment.id} className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700">
                       <p className="text-sm text-muted-foreground mb-1">
                         {/* Display commenter's name - requires joining with users table */}
                         User {comment.user_id} commented on {new Date(comment.created_at).toLocaleString()}
                       </p>
                       <p>{comment.content}</p>
                       {/* TODO: Implement threaded comments */}
                     </div>
                   ))}
                 </div>
               )}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
