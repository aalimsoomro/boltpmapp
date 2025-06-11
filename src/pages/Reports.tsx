import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CSVLink } from 'react-csv'; // Assuming react-csv is installed

interface ProjectReportData {
  id: string;
  name: string;
  vendor: string;
  status: string;
  start_date: string;
  end_date: string;
  completion_percentage: number;
  total_budget: number; // Assuming you calculate this
  // Add other relevant fields for reporting
}

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ project: '', vendor: '', status: '' });
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]); // Assuming a vendors table

  useEffect(() => {
    if (!authLoading && user) {
      fetchProjectsForReport();
      fetchVendors(); // Fetch vendors for filter dropdown
    }
  }, [user, authLoading]);

  const fetchProjectsForReport = async () => {
    setLoading(true);
    try {
      // Fetch projects and potentially join with activities to calculate budget/completion
      // This query might need to be more complex or use a Supabase View/Function
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          vendor,
          status,
          start_date,
          end_date,
          completion_percentage,
          activities ( quantity, rate )
        `); // Select activities to calculate budget

      if (error) throw error;

      // Calculate total budget for each project
      const projectsWithBudget = data?.map(project => {
        const total_budget = project.activities.reduce((sum, activity) => {
          return sum + (activity.quantity || 0) * (activity.rate || 0);
        }, 0);
        // Remove the nested activities data as it's not needed in the final report list
        const { activities, ...rest } = project;
        return { ...rest, total_budget };
      }) || [];


      setProjects(projectsWithBudget);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching projects for report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load report data.',
      });
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
     try {
       const { data, error } = await supabase
         .from('vendors') // Assuming you have a 'vendors' table
         .select('id, name');

       if (error) throw error;
       setVendors(data || []);
     } catch (error) {
       console.error('Error fetching vendors:', error);
     }
   };


  const filteredProjects = projects.filter(p => {
    const projectMatch = filters.project ? p.name.toLowerCase().includes(filters.project.toLowerCase()) : true;
    const vendorMatch = filters.vendor ? p.vendor === filters.vendor : true; // Assuming vendor filter uses vendor name/ID
    const statusMatch = filters.status ? p.status === filters.status : true;
    return projectMatch && vendorMatch && statusMatch;
  });

  // Data for CSV export
  const csvData = [
    ["Project Name", "Vendor", "Status", "Start Date", "End Date", "Completion %", "Total Budget"],
    ...filteredProjects.map(p => [
      p.name,
      p.vendor,
      p.status,
      p.start_date,
      p.end_date,
      p.completion_percentage,
      p.total_budget.toFixed(2), // Format budget
    ])
  ];


  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Reports</h1>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-6">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filterProject">Project Name</Label>
              <Input
                id="filterProject"
                type="text"
                placeholder="Filter by project name..."
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="filterVendor">Vendor</Label>
               <Select value={filters.vendor} onValueChange={(value) => setFilters({ ...filters, vendor: value })}>
                 <SelectTrigger id="filterVendor">
                   <SelectValue placeholder="Filter by vendor" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="">All Vendors</SelectItem>
                   {vendors.map(vendor => (
                     <SelectItem key={vendor.id} value={vendor.name}>{vendor.name}</SelectItem> {/* Assuming vendor name is used for filtering */}
                   ))}
                 </SelectContent>
               </Select>
            </div>
            <div>
              <Label htmlFor="filterStatus">Status</Label>
               <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                 <SelectTrigger id="filterStatus">
                   <SelectValue placeholder="Filter by status" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="">All Statuses</SelectItem>
                   <SelectItem value="ongoing">Ongoing</SelectItem>
                   <SelectItem value="completed">Completed</SelectItem>
                   <SelectItem value="delayed">Delayed</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Filtered Projects Report</CardTitle>
          <CSVLink data={csvData} filename={"projects_report.csv"}>
             <Button variant="outline" disabled={filteredProjects.length === 0}>Export CSV</Button>
          </CSVLink>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading report data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Project Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completion %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Budget</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProjects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{project.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{project.vendor}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                           ${project.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                           ${project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                           ${project.status === 'delayed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
                         `}>
                           {project.status}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{project.start_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{project.end_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{project.completion_percentage || 0}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">${project.total_budget.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
           {filteredProjects.length === 0 && !loading && (
             <p className="text-center text-muted-foreground mt-4">No projects match the filters.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
