import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';

interface ProfileFormData {
  name: string;
  // Add other profile fields like avatar_url, contact_info etc.
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  created_at: string;
}

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>();

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserProfile(user.id);
    }
  }, [user, authLoading]);

  const fetchUserProfile = async (userId: string) => {
    setLoadingProfile(true);
    try {
      // Fetch user details from the 'users' table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setAppUser(data);
      reset({ name: data.name }); // Set form default value
      setLoadingProfile(false);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load profile.',
      });
      setLoadingProfile(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update user details in the 'users' table
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ name: data.name })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setAppUser(updatedUser); // Update local state
      toast({ title: 'Success', description: 'Profile updated successfully.' });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message || 'An unexpected error occurred.',
      });
      console.error('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
     await signOut();
     // Redirect handled by AuthProvider/ProtectedRoute
  };


  if (authLoading || loadingProfile) {
    return <div className="flex items-center justify-center min-h-screen">Loading profile...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!appUser) {
      return <div className="flex items-center justify-center min-h-screen">User profile not found.</div>;
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Your Profile</h1>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              {/* Email is usually not editable via profile page */}
              <Input id="email" type="email" value={appUser.email} disabled className="cursor-not-allowed opacity-80" />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                {...register('name', { required: 'Name is required' })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
             <div>
               <Label htmlFor="role">Role</Label>
               <Input id="role" type="text" value={appUser.role} disabled className="cursor-not-allowed opacity-80" />
             </div>
             <div>
               <Label htmlFor="approved">Approved</Label>
               <Input id="approved" type="text" value={appUser.approved ? 'Yes' : 'No'} disabled className="cursor-not-allowed opacity-80" />
             </div>
            {/* Add other profile fields here */}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Profile'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
             <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
