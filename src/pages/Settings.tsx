import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, useFieldArray } from 'react-hook-form';

interface SettingsFormData {
  allowed_file_types: string; // Comma-separated string
  // Add other settings fields here (e.g., default_role, notification_settings)
  project_types: { value: string }[]; // Example: list of project types
  vendor_list: { value: string }[]; // Example: list of vendors
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Implement Admin role check
  // const isAdmin = user?.user_metadata?.role === 'admin';
  const isAdmin = true; // Placeholder: Assume user is admin for now

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SettingsFormData>({
    defaultValues: {
      allowed_file_types: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.png', // Default value
      project_types: [],
      vendor_list: [],
    },
  });

  const { fields: projectTypeFields, append: appendProjectType, remove: removeProjectType } = useFieldArray({
    control,
    name: 'project_types',
  });

  const { fields: vendorFields, append: appendVendor, remove: removeVendor } = useFieldArray({
    control,
    name: 'vendor_list',
  });


  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      fetchSettings();
    }
  }, [user, authLoading, isAdmin]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      // Fetch settings from the 'settings' table (assuming a single row or specific key)
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single(); // Assuming a single settings row

      if (error && error.code !== 'PGRST116') { // PGRST116 means no row found
         throw error;
      }

      if (data) {
         reset({
           allowed_file_types: data.allowed_file_types || '.pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.png',
           // Assuming project_types and vendor_list are stored as JSON arrays of strings
           project_types: (data.project_types as string[] || []).map(val => ({ value: val })),
           vendor_list: (data.vendor_list as string[] || []).map(val => ({ value: val })),
           // Map other settings fields
         });
      }


      setLoadingSettings(false);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load settings.',
      });
      setLoadingSettings(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!user || !isAdmin) {
      toast({ variant: 'destructive', title: 'Error', description: 'Access Denied.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data for update
      const settingsToUpdate = {
        allowed_file_types: data.allowed_file_types,
        // Convert field arrays back to simple string arrays for DB
        project_types: data.project_types.map(item => item.value).filter(Boolean), // Filter out empty strings
        vendor_list: data.vendor_list.map(item => item.value).filter(Boolean),
        // Add other settings fields
      };

      // Update or Insert settings (assuming a single row identified by a key or ID)
      // This example assumes you have a single row with a known ID (e.g., 'global_settings')
      // or you upsert based on a unique key. If no row exists, you might need to insert.
      const { data: updatedSettings, error } = await supabase
        .from('settings')
        .update(settingsToUpdate)
        .eq('id', 'global_settings'); // Replace 'global_settings' with your actual settings row ID or unique key

      if (error) {
         // If update fails, try inserting if the error indicates the row doesn't exist
         if (error.code === 'PGRST116') { // No row found for update
            const { data: insertedSettings, error: insertError } = await supabase
              .from('settings')
              .insert([{ id: 'global_settings', ...settingsToUpdate }]); // Include the ID for the new row

            if (insertError) throw insertError;
            console.log("Settings row inserted:", insertedSettings);

         } else {
           throw error; // Re-throw other errors
         }
      }

      toast({ title: 'Success', description: 'Settings updated successfully.' });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating settings',
        description: error.message || 'An unexpected error occurred.',
      });
      console.error('Settings update error:', error);
    } finally {
      setIsSubmitting(false);
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

  if (loadingSettings) {
      return <div className="flex items-center justify-center min-h-screen">Loading settings...</div>;
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Settings</h1>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="allowed_file_types">Allowed File Types (comma-separated)</Label>
              <Input
                id="allowed_file_types"
                type="text"
                {...register('allowed_file_types')}
                placeholder=".pdf,.doc,.docx,..."
              />
            </div>

            {/* Example: Dynamic list for Project Types */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Project Types</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendProjectType({ value: '' })}
                >
                  Add Type
                </Button>
              </div>
              <div className="space-y-2">
                {projectTypeFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      {...register(`project_types.${index}.value` as const)}
                      defaultValue={field.value}
                      placeholder="e.g., Construction"
                    />
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeProjectType(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

             {/* Example: Dynamic list for Vendors */}
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <Label>Vendors</Label>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => appendVendor({ value: '' })}
                 >
                   Add Vendor
                 </Button>
               </div>
               <div className="space-y-2">
                 {vendorFields.map((field, index) => (
                   <div key={field.id} className="flex gap-2 items-center">
                     <Input
                       type="text"
                       {...register(`vendor_list.${index}.value` as const)}
                       defaultValue={field.value}
                       placeholder="e.g., Acme Corp"
                     />
                     <Button type="button" variant="destructive" size="sm" onClick={() => removeVendor(index)}>
                       Remove
                     </Button>
                   </div>
                 ))}
               </div>
             </div>

            {/* Add other settings sections */}

            <div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
