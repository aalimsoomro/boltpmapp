import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProjectFile {
  id: string;
  name: string;
  url: string; // URL from Supabase Storage
  uploaded_at: string;
  project_id: string;
  user_id: string; // Uploader's user ID
  // Add activity_id if files can be linked to activities
}

export default function Files() {
  const { user, loading: authLoading } = useAuth();
  const { id: projectId } = useParams<{ id: string }>(); // Project ID from URL
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && user && projectId) {
      fetchFiles(projectId);
    }
  }, [user, authLoading, projectId]);

  const fetchFiles = async (projectId: string) => {
    setLoading(true);
    try {
      // Fetch files associated with this project
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load files.',
      });
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleFileUpload = async () => {
    if (!user || !projectId || !selectedFile) {
      toast({ variant: 'destructive', title: 'Error', description: 'No file selected or project ID missing.' });
      return;
    }

    setUploading(true);
    const filePath = `${projectId}/${Date.now()}_${selectedFile.name}`; // Unique path in storage bucket

    try {
      // 1. Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files') // Replace with your storage bucket name
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL (or signed URL if bucket is private)
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Save file metadata to the 'files' table
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert([
          {
            name: selectedFile.name,
            url: publicUrl,
            project_id: projectId,
            user_id: user.id,
            // activity_id: null, // If linking to activities is needed
          },
        ])
        .select()
        .single();

      if (dbError) {
         // If DB insert fails, attempt to delete the uploaded file from storage
         console.error("Failed to save file record, attempting to delete storage file:", dbError);
         await supabase.storage.from('project-files').remove([filePath]);
         throw dbError; // Re-throw the error
      }


      toast({ title: 'Success', description: 'File uploaded successfully.' });
      setSelectedFile(null); // Clear selected file
      fetchFiles(projectId); // Refresh the file list

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error uploading file',
        description: error.message || 'An unexpected error occurred during upload.',
      });
      console.error('File upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, filePathInStorage: string) => {
     if (!user || !projectId) {
       toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated or project ID missing.' });
       return;
     }

     // TODO: Implement permission check (e.g., only uploader or admin can delete)

     if (window.confirm('Are you sure you want to delete this file?')) {
       try {
         // 1. Delete record from 'files' table
         const { error: dbError } = await supabase
           .from('files')
           .delete()
           .eq('id', fileId);

         if (dbError) throw dbError;

         // 2. Delete file from Supabase Storage
         const { data: storageData, error: storageError } = await supabase.storage
           .from('project-files') // Replace with your storage bucket name
           .remove([filePathInStorage]); // Pass the path(s) to remove

         if (storageError) {
            // Log storage error but don't block if DB record was deleted
            console.error("Error deleting file from storage:", storageError);
         }


         toast({ title: 'Success', description: 'File deleted successfully.' });
         fetchFiles(projectId); // Refresh the file list

       } catch (error: any) {
         toast({
           variant: 'destructive',
           title: 'Error deleting file',
           description: error.message || 'An unexpected error occurred during deletion.',
         });
         console.error('File deletion error:', error);
       }
     }
   };


  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!projectId) {
      return <div className="flex items-center justify-center min-h-screen">Project ID is missing.</div>;
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Files for Project {projectId}</h1> {/* Display project name */}

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <CardHeader>
          <CardTitle>Upload New File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Select File</Label>
            <Input id="file" type="file" onChange={handleFileSelect} />
          </div>
          <Button onClick={handleFileUpload} disabled={!selectedFile || uploading}>
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mt-6">
        <CardHeader>
          <CardTitle>Project Files</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading files...</div>
          ) : (
            <div className="space-y-4">
              {files.length === 0 ? (
                <p className="text-center text-muted-foreground">No files uploaded yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {files.map(file => (
                    <li key={file.id} className="py-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">Uploaded on {new Date(file.uploaded_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => window.open(file.url, '_blank')}>Download</Button>
                        {/* Note: Deleting from storage requires the path used during upload.
                           You might need to store the storage path in your 'files' table.
                           For now, using a placeholder path. */}
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteFile(file.id, `project-files/${projectId}/${file.name}`)}>Delete</Button> {/* Placeholder path */}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
