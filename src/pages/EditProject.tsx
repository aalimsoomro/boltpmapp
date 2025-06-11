import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Activity {
  id?: string; // Supabase ID
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  start_date?: string;
  end_date?: string;
  project_id?: string;
}

interface ProjectFormData {
  name: string;
  startDate: string;
  endDate: string;
  vendor: string;
  description: string;
  status: 'ongoing' | 'completed' | 'delayed';
  completion_percentage: number;
  activities: Activity[];
}

export default function EditProject() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loadingProject, setLoadingProject] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      name: '',
      startDate: '',
      endDate: '',
      vendor: '',
      description: '',
      status: 'ongoing',
      completion_percentage: 0,
      activities: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'activities',
  });

  useEffect(() => {
    if (!authLoading && user && id) {
      fetchProjectDetails(id);
    }
  }, [user, authLoading, id]);

  const fetchProjectDetails = async (projectId: string) => {
    setLoadingProject(true);
    try {
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch related activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId);

      if (activitiesError) throw activitiesError;

      // Set form values
      reset({
        name: projectData.name,
        startDate: projectData.start_date,
        endDate: projectData.end_date,
        vendor: projectData.vendor,
        description: projectData.description,
        status: projectData.status,
        completion_percentage: projectData.completion_percentage || 0,
        activities: activitiesData || [],
      });

      setLoadingProject(false);

    } catch (error: any) {
      console.error('Error fetching project details for edit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load project details for editing.',
      });
      setLoadingProject(false);
    }
  };


  const onSubmit = async (data: ProjectFormData) => {
    if (!user || !id) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated or project ID missing.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update the project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .update({
          name: data.name,
          start_date: data.startDate,
          end_date: data.endDate,
          vendor: data.vendor,
          description: data.description,
          status: data.status,
          completion_percentage: data.completion_percentage,
          // user_id is not updated here as it's the creator
        })
        .eq('id', id);

      if (projectError) throw projectError;

      // 2. Sync activities
      // This is a simplified sync: delete all existing activities and re-insert
      // A more robust approach would compare existing vs. new and perform inserts/updates/deletes
      const { error: deleteActivitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('project_id', id);

      if (deleteActivitiesError) throw deleteActivitiesError;

      if (data.activities && data.activities.length > 0) {
        const activitiesToInsert = data.activities.map(activity => ({
          ...activity,
          project_id: id, // Link activity to the project
          // Ensure quantity and rate are numbers
          quantity: Number(activity.quantity) || 0,
          rate: Number(activity.rate) || 0,
          // Remove the old 'id' if it exists, as Supabase will generate a new one on insert
          id: undefined,
        }));

        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .insert(activitiesToInsert);

        if (activitiesError) throw activitiesError;
      }


      toast({ title: 'Success', description: 'Project updated successfully.' });
      navigate(`/projects/${id}`); // Redirect to project detail page

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating project',
        description: error.message || 'An unexpected error occurred.',
      });
      console.error('Error updating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingProject) {
    return <div className="flex items-center justify-center min-h-screen">Loading project data...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Edit Project</h1>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Project name is required' })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  type="text"
                  {...register('vendor')}
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                />
              </div>
               <div>
                 <Label htmlFor="status">Status</Label>
                 <select
                   id="status"
                   {...register('status')}
                   className="w-full px-3 py-2 border rounded-md bg-background"
                 >
                   <option value="ongoing">Ongoing</option>
                   <option value="completed">Completed</option>
                   <option value="delayed">Delayed</option>
                 </select>
               </div>
               <div>
                 <Label htmlFor="completion_percentage">Completion (%)</Label>
                 <Input
                   id="completion_percentage"
                   type="number"
                   step="1"
                   min="0"
                   max="100"
                   {...register('completion_percentage', { valueAsNumber: true })}
                 />
               </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Activities</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ name: '', quantity: 0, unit: '', rate: 0 })}
                >
                  Add Activity
                </Button>
              </div>
              <div className="border rounded-md p-4 space-y-4">
                {fields.length === 0 && <p className="text-center text-muted-foreground">No activities added yet.</p>}
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="md:col-span-2">
                      <Label htmlFor={`activities.${index}.name`}>Activity Name</Label>
                      <Input
                        id={`activities.${index}.name`}
                        type="text"
                        {...register(`activities.${index}.name` as const, { required: 'Name is required' })}
                        defaultValue={field.name}
                        className={errors.activities?.[index]?.name ? 'border-red-500' : ''}
                      />
                       {errors.activities?.[index]?.name && <p className="text-red-500 text-sm mt-1">{errors.activities[index].name.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`activities.${index}.quantity`}>Qty</Label>
                      <Input
                        id={`activities.${index}.quantity`}
                        type="number"
                        step="0.01"
                        {...register(`activities.${index}.quantity` as const, { valueAsNumber: true })}
                        defaultValue={field.quantity}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`activities.${index}.unit`}>Unit</Label>
                      <Input
                        id={`activities.${index}.unit`}
                        type="text"
                        {...register(`activities.${index}.unit` as const)}
                        defaultValue={field.unit}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`activities.${index}.rate`}>Rate</Label>
                      <Input
                        id={`activities.${index}.rate`}
                        type="number"
                        step="0.01"
                        {...register(`activities.${index}.rate` as const, { valueAsNumber: true })}
                        defaultValue={field.rate}
                      />
                    </div>
                     {/* Optional Activity Dates */}
                     {/*
                     <div>
                       <Label htmlFor={`activities.${index}.start_date`}>Start Date</Label>
                       <Input
                         id={`activities.${index}.start_date`}
                         type="date"
                         {...register(`activities.${index}.start_date` as const)}
                         defaultValue={field.start_date}
                       />
                     </div>
                     <div>
                       <Label htmlFor={`activities.${index}.end_date`}>End Date</Label>
                       <Input
                         id={`activities.${index}.end_date`}
                         type="date"
                         {...register(`activities.${index}.end_date` as const)}
                         defaultValue={field.end_date}
                       />
                     </div>
                     */}
                    <div className="flex items-center justify-center">
                      <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
