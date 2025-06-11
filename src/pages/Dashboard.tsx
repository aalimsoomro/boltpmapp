import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  console.log("Dashboard component rendering...");
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ total: 0, ongoing: 0, completed: 0, delayed: 0 });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activityFeed, setActivityFeed] = useState([]); // Placeholder for activity feed

  useEffect(() => {
    console.log("Dashboard useEffect running. User:", user, "Auth Loading:", authLoading);
    if (!authLoading && user) {
      fetchStats();
      fetchActivityFeed();
    } else if (!authLoading && !user) {
      console.log("User not authenticated, redirecting...");
    }
  }, [user, authLoading]);

  const fetchStats = async () => {
    console.log("Fetching project stats...");
    setProjectsLoading(true);
    const { data, error, count } = await supabase
      .from('projects')
      .select('id, status', { count: 'exact' }); // Fetch status to count different types

    if (error) {
      console.error('Error fetching stats:', error);
      setProjectsLoading(false);
      // Optionally set stats to default or show an error state
      return;
    }

    console.log("Stats fetched successfully:", data, "Count:", count);
    const total = count || 0;
    const completed = data?.filter(p => p.status === 'completed').length || 0;
    const ongoing = data?.filter(p => p.status === 'ongoing').length || 0;
    const delayed = data?.filter(p => p.status === 'delayed').length || 0;

    setStats({ total, ongoing, completed, delayed });
    setProjectsLoading(false);
  };

  const fetchActivityFeed = async () => {
    console.log("Fetching activity feed...");
    // Fetch recent activities or comments
    // This is a placeholder, implement actual fetching logic
    console.log("Fetching activity feed...");
    // Example: Fetch last 10 comments or activity updates
    // const { data, error } = await supabase
    //   .from('comments') // Or 'activities' with a timestamp
    //   .select('...')
    //   .order('created_at', { ascending: false })
    //   .limit(10);
    // if (error) console.error('Error fetching activity feed:', error);
    // else setActivityFeed(data);
  };


  if (authLoading) {
    console.log("Auth loading...");
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (!user) {
    console.log("User is null, navigating to login...");
    return <Navigate to="/login" />;
  }

  console.log("Rendering dashboard content. Stats:", stats);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsLoading ? '...' : stats.total}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p> {/* Placeholder */}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-dot"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsLoading ? '...' : stats.ongoing}</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p> {/* Placeholder */}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10"/><path d="m8 15 2 2 6-6"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsLoading ? '...' : stats.completed}</div>
            <p className="text-xs text-muted-foreground">+50% from last month</p> {/* Placeholder */}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer-off"><path d="M10.5 2h3"/><path d="M8 7.9c-1.4 1.3-2.3 3.1-2.4 5.1-.4 6 5.1 11.5 11.1 11.9 1.6.1 3.2-.3 4.6-1.1"/><path d="M12 12v-1"/><path d="M16.2 16.2l-1.4-1.4"/><path d="M7.8 7.8l1.4 1.4"/><path d="m2 2 20 20"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{projectsLoading ? '...' : stats.delayed}</div>
            <p className="text-xs text-muted-foreground">+5% from last month</p> {/* Placeholder */}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Project Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
             {projectsLoading ? (
               <div>Loading chart data...</div>
             ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={[
                    { name: 'Ongoing', count: stats.ongoing },
                    { name: 'Completed', count: stats.completed },
                    { name: 'Delayed', count: stats.delayed },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
             )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder for activity feed */}
            <ul>
              <li>Activity 1...</li>
              <li>Activity 2...</li>
              <li>Activity 3...</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
