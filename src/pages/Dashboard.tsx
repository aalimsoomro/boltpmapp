import { useAuth } from '@/context/AuthContext';
    import { Button } from '@/components/ui/button';
    import { supabase } from '@/lib/supabaseClient';
    import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
    import { BarChart, PieChart, Pie, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    // import { Progress } from '@/components/ui/progress'; // Removed unused import
    // import { Separator } from '@/components/ui/separator'; // Removed unused import
    import { BellIcon } from 'lucide-react'; // Using Lucide React for icons
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


    // Dummy Data for Dashboard
    const kpiData = [
      { label: 'Total Projects', value: 45, color: 'bg-blue-500' },
      { label: 'Ongoing', value: 28, color: 'bg-yellow-500' },
      { label: 'Delayed', value: 5, color: 'bg-red-500' },
      { label: 'Completed', value: 12, color: 'bg-green-500' },
    ];

    const projectStatusData = [
      { name: 'Ongoing', value: 28, color: '#facc15' }, // yellow-500
      { name: 'Delayed', value: 5, color: '#ef4444' }, // red-500
      { name: 'Completed', value: 12, color: '#22c55e' }, // green-500
      { name: 'Not Started', value: 10, color: '#6b7280' }, // gray-500
    ];

    const costData = [
      { name: 'Project A', planned: 50000, actual: 45000 },
      { name: 'Project B', planned: 75000, actual: 80000 },
      { name: 'Project C', planned: 30000, actual: 28000 },
      { name: 'Project D', planned: 100000, actual: 95000 },
    ];

    const upcomingActivityData = [
      { task: 'Review Project Proposal', project: 'Project Alpha', dueDate: '2024-08-15', assignee: 'Alice' },
      { task: 'Vendor Meeting', project: 'Project Beta', dueDate: '2024-08-18', assignee: 'Bob' },
      { task: 'Submit Report', project: 'Project Gamma', dueDate: '2024-08-20', assignee: 'Charlie' },
      { task: 'Plan Next Sprint', project: 'Project Alpha', dueDate: '2024-08-22', assignee: 'Alice' },
    ];

    const recentUpdatesData = [
      { update: 'Project Alpha status updated to In Progress', time: '2 hours ago' },
      { update: 'New file uploaded to Project Beta', time: '1 day ago' },
      { update: 'Comment added on Activity X in Project Gamma', time: '1 day ago' },
      { update: 'User Bob joined Project Beta', time: '2 days ago' },
    ];


    function Dashboard() {
      const { user, loading } = useAuth();

      const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Logout Error:', error);
        }
      };

      if (loading) {
        return <div>Loading...</div>; // Or a skeleton loader
      }

      if (!user) {
        // This should ideally be handled by routing, but adding a fallback
        return <div>Please log in.</div>;
      }

      return (
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex items-center space-x-4">
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <BellIcon className="h-5 w-5" />
                    <span className="sr-only">View notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {recentUpdatesData.map((update, index) => (
                    <DropdownMenuItem key={index}>
                      {update.update} <span className="ml-2 text-xs text-muted-foreground">{update.time}</span>
                    </DropdownMenuItem>
                  ))}
                   {recentUpdatesData.length === 0 && (
                     <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                   )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleLogout}>Logout</Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpiData.map((kpi, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                  {/* Optional: Add an icon here */}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  {/* Optional: Add a trend indicator */}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost: Planned vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="planned" fill="#8884d8" name="Planned Cost" />
                      <Bar dataKey="actual" fill="#82ca9d" name="Actual Cost" />
                    </BarChart>
                  </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Assignee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingActivityData.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>{activity.task}</TableCell>
                        <TableCell>{activity.project}</TableCell>
                        <TableCell>{activity.dueDate}</TableCell>
                        <TableCell>{activity.assignee}</TableCell>
                      </TableRow>
                    ))}
                     {upcomingActivityData.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={4} className="text-center">No upcoming activities.</TableCell>
                       </TableRow>
                     )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {recentUpdatesData.map((update, index) => (
                      <div key={index} className="border-b pb-2 last:border-b-0 last:pb-0">
                        <p className="text-sm">{update.update}</p>
                        <p className="text-xs text-muted-foreground">{update.time}</p>
                      </div>
                    ))}
                    {recentUpdatesData.length === 0 && (
                      <p className="text-sm text-center text-muted-foreground">No recent updates.</p>
                    )}
                 </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    export default Dashboard;
