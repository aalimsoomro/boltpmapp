import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Activity {
  id?: string; // Supabase ID after insert
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  start_date?: string; // Optional dates for activities
  end_date?: string;
  project_id?: string; // Link to project
}

interface ProjectFormData {
  name: string;
  startDate: string;
  endDate: string;
  vendor: string;
  description: string;
  activities: Activity[];
}

export default function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      activities: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'activities',
  });

  const onSubmit = async (data: ProjectFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Insert the new project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: data.name,
            start_date: data.startDate,
            end_date: data.endDate,
            vendor: data.vendor,
            description: data.description,
            user_id: user.id, // Link project to the creating user
            status: 'ongoing', // Default status
          },
        ])
        .select() // Select the inserted data to get the project ID
        .single();

      if (projectError) throw projectError;

      const newProjectId = projectData.id;

      // 2. Insert activities linked to the new project
      if (data.activities && data.activities.length > 0) {
        const activitiesToInsert = data.activities.map(activity => ({
          ...activity,
          project_id: newProjectId, // Link activity to the new project
          // Ensure quantity and rate are numbers
          quantity: Number(activity.quantity) || 0,
          rate: Number(activity.rate) || 0,
        }));

        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .insert(activitiesToInsert);

        if (activitiesError) throw activitiesError;
      }


      toast({ title: 'Success', description: 'Project created successfully.' });
      reset(); // Clear form
      navigate(`/projects/${newProjectId}`); // Redirect to project detail page

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating project',
        description: error.message || 'An unexpected error occurred.',
      });
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error("CSV Parsing Errors:", results.errors);
          toast({
            variant: 'destructive',
            title: 'CSV Parsing Error',
            description: 'Could not parse CSV file. Check console for details.',
          });
          return;
        }

        const newActivities: Activity[] = results.data.map((row: any) => ({
          name: row['Activity Name'] || '',
          quantity: parseFloat(row['Quantity']) || 0,
          unit: row['Unit'] || '',
          rate: parseFloat(row['Rate']) || 0,
          start_date: row['Start Date'] || undefined, // Use undefined if empty
          end_date: row['End Date'] || undefined,
        })).filter(activity => activity.name); // Filter out rows with no name

        // Clear existing activities and append new ones from CSV
        remove(); // Remove all current fields
        append(newActivities);

        toast({
          title: 'CSV Imported',
          description: `${newActivities.length} activities loaded from CSV.`,
        });
      },
      error: (error: any) => {
         console.error("CSV Parsing Error:", error);
         toast({
           variant: 'destructive',
           title: 'CSV Parsing Error',
           description: error.message || 'An error occurred during CSV parsing.',
         });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Create New Project</h1>

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
              <div>
                 <Label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   Upload Activities from CSV
                 </Label>
                 <Input
                   id="csvFile"
                   type="file"
                   accept=".csv"
                   onChange={handleCsvUpload}
                   className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100"
                 />
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
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
