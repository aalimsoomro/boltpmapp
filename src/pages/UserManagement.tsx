import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AppUser {
  id: string; // Matches auth.users.id
  name: string;
  email: string;
  role: 'pending' | 'admin' | 'manager' | 'vendor' | 'employee';
  approved: boolean;
  created_at: string;
}

export default function UserManagement() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Implement Admin role check
  // const isAdmin = user?.user_metadata?.role === 'admin';
  const isAdmin = true; // Placeholder: Assume user is admin for now

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      fetchUsers();
    }
  }, [user, authLoading, isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users from the 'users' table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load users.',
      });
      setLoading(false);
    }
  };

  const handleApproveDeny = async (userId: string, approved: boolean) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ approved: approved })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, approved: approved } : u));

      toast({
        title: 'Success',
        description: `User ${approved ? 'approved' : 'denied'}.`,
      });
    } catch (error: any) {
      console.error('Error updating user approval status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user status.',
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppUser['role']) => {
     try {
       const { data, error } = await supabase
         .from('users')
         .update({ role: newRole })
         .eq('id', userId);

       if (error) throw error;

       // Update local state
       setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

       toast({
         title: 'Success',
         description: `User role updated to ${newRole}.`,
       });
     } catch (error: any) {
       console.error('Error updating user role:', error);
       toast({
         variant: 'destructive',
         title: 'Error',
         description: error.message || 'Failed to update user role.',
       });
     }
   };


  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Access Denied. Admins only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">User Management</h1>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Approved</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((appUser) => (
                    <tr key={appUser.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{appUser.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{appUser.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <Select value={appUser.role} onValueChange={(value: AppUser['role']) => handleRoleChange(appUser.id, value)}>
                           <SelectTrigger className="w-[180px]">
                             <SelectValue placeholder="Select Role" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="admin">Admin</SelectItem>
                             <SelectItem value="manager">Manager</SelectItem>
                             <SelectItem value="vendor">Vendor</SelectItem>
                             <SelectItem value="employee">Employee</SelectItem>
                             <SelectItem value="pending">Pending</SelectItem> {/* Allow setting back to pending? */}
                           </SelectContent>
                         </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${appUser.approved ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                        `}>
                          {appUser.approved ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!appUser.approved ? (
                          <Button variant="outline" size="sm" onClick={() => handleApproveDeny(appUser.id, true)} className="mr-2">Approve</Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleApproveDeny(appUser.id, false)} className="mr-2">Deny</Button>
                        )}
                        {/* Add Delete User button (use with caution!) */}
                        {/* <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(appUser.id)}>Delete</Button> */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
           {users.length === 0 && !loading && (
             <p className="text-center text-muted-foreground mt-4">No users found.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
