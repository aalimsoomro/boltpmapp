import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have a Textarea component
import { Trash2 } from 'lucide-react'; // Assuming you have lucide-react installed
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Define the schema for a single activity
const activitySchema = z.object({
  name: z.string().min(1, { message: 'Activity name is required' }),
  quantity: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0, { message: 'Quantity must be a non-negative number' }).optional()
  ).nullable().default(0),
  unit: z.string().optional(),
  rate: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0, { message: 'Rate must be a non-negative number' }).optional()
  ).nullable().default(0),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
});

// Define the schema for the entire form
const formSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required' }),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  activities: z.array(activitySchema),
});

type FormValues = z.infer<typeof formSchema>;

function NewProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      start_date: undefined,
      end_date: undefined,
      vendor: '',
      description: '',
      activities: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'activities',
  });

  const activities = form.watch('activities');

  const totalBudget = useMemo(() => {
    return activities.reduce((sum, activity) => {
      const qty = activity.quantity ?? 0;
      const rate = activity.rate ?? 0;
      return sum + (qty * rate);
    }, 0);
  }, [activities]);

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedActivities = results.data.map((row: any) => ({
          name: row['Activity Name'] || '', // Map CSV column names
          quantity: row['Qty'] ? Number(row['Qty']) : 0,
          unit: row['Unit'] || '',
          rate: row['Rate'] ? Number(row['Rate']) : 0,
          start_date: row['Start Date'] ? new Date(row['Start Date']) : undefined,
          end_date: row['End Date'] ? new Date(row['End Date']) : undefined,
        })).filter(activity => activity.name); // Filter out rows with no name

        // Clear existing activities and append parsed ones
        form.setValue('activities', parsedActivities);

        toast({
          title: 'CSV Imported',
          description: `${parsedActivities.length} activities loaded from CSV.`,
        });
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast({
          variant: 'destructive',
          title: 'CSV Import Error',
          description: error.message,
        });
      }
    });
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'User not logged in.',
      });
      setLoading(false);
      return;
    }

    try {
      // Insert project first
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: values.name,
          start_date: values.start_date?.toISOString(), // Convert Date to ISO string for Supabase
          end_date: values.end_date?.toISOString(), // Convert Date to ISO string for Supabase
          vendor: values.vendor,
          description: values.description,
          created_by: userId,
        })
        .select('id') // Select the newly created project ID
        .single();

      if (projectError) {
        throw projectError;
      }

      const projectId = projectData.id;

      // Prepare activities for insertion
      const activitiesToInsert = values.activities.map(activity => ({
        ...activity,
        project_id: projectId,
        start_date: activity.start_date?.toISOString(), // Convert Date to ISO string
        end_date: activity.end_date?.toISOString(), // Convert Date to ISO string
      }));

      // Insert activities
      if (activitiesToInsert.length > 0) {
        const { error: activitiesError } = await supabase
          .from('activities')
          .insert(activitiesToInsert);

        if (activitiesError) {
          // Consider deleting the project if activity insert fails to maintain consistency
          await supabase.from('projects').delete().eq('id', projectId);
          throw activitiesError;
        }
      }

      toast({
        title: 'Project Created',
        description: 'Your new project and activities have been saved.',
      });

      // Redirect to dashboard or project details page
      navigate('/dashboard'); // Or navigate(`/projects/${projectId}`);

    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create Project',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4"> {/* Added padding and max width */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Project Alpha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker date={field.value || undefined} setDate={field.onChange} placeholder="Select start date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                         <DatePicker date={field.value || undefined} setDate={field.onChange} placeholder="Select end date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Project description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Activity List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Activities</h3>
                 {/* CSV Upload */}
                <div className="flex items-center space-x-2">
                  <Label htmlFor="csv-upload" className="shrink-0">Upload CSV:</Label>
                  <Input id="csv-upload" type="file" accept=".csv" onChange={handleCSVUpload} className="flex-grow" />
                </div>

                {fields.map((item, index) => (
                  <Card key={item.id} className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                      <FormField
                        control={form.control}
                        name={`activities.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Activity Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Activity name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`activities.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Qty" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`activities.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <FormControl>
                              <Input placeholder="Unit" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`activities.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rate</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Rate" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`activities.${index}.start_date`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <DatePicker date={field.value || undefined} setDate={field.onChange} placeholder="Activity start date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`activities.${index}.end_date`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <DatePicker date={field.value || undefined} setDate={field.onChange} placeholder="Activity end date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} className="self-end">
                        <Trash2 className="mr-2 h-4 w-4" /> Remove Activity
                      </Button>
                  </Card>
                ))}
                 <Button type="button" variant="outline" onClick={() => append({ name: '', quantity: 0, unit: '', rate: 0, start_date: undefined, end_date: undefined })}>
                  Add Activity
                </Button>
              </div>

              {/* Budget Summary */}
              <div className="text-right text-lg font-semibold">
                Total Budget: ${totalBudget.toFixed(2)}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Project'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          {/* Optional: Add links or notes here */}
        </CardFooter>
      </Card>
    </div>
  );
}

export default NewProject;
