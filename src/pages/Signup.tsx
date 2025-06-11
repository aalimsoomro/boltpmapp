import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Signup() {
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee'); // Default role for new signups
  const [isSigningUp, setIsSigningUp] = useState(false);


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    try {
      // Supabase Auth signUp creates the auth user.
      // We also need to create a corresponding record in our 'users' table.
      const { data: authData, error: authError } = await signUp(email, password, {
         data: { name: name, role: role } // Optional: pass data to auth user metadata
      });

      if (authError) throw authError;

      // Create user record in public.users table with default 'pending' status
      const { data: userRecord, error: dbError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user?.id, // Link to auth.users.id
            name: name,
            email: email,
            role: 'pending', // Default role is pending admin approval
            approved: false,
          },
        ]);

      if (dbError) {
        // If DB insert fails, you might want to delete the auth user created above
        console.error("Failed to create user record, attempting to delete auth user:", dbError);
        await supabase.auth.admin.deleteUser(authData.user?.id!); // Requires service role key, not available client-side
        throw dbError; // Re-throw the error
      }


      toast({
        title: 'Registration successful',
        description: 'Your account is pending admin approval. You will be notified once approved.',
      });
      navigate('/login'); // Redirect to login after signup

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'An unexpected error occurred.',
      });
      console.error('Signup error:', error);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
             {/* Role selection might be removed or restricted based on signup flow */}
            {/* For now, allowing selection but defaulting to 'employee' and setting 'pending' in DB */}
            {/*
            <div>
              <Label htmlFor="role">Desired Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="employee">Employee</option>
                <option value="vendor">Vendor</option>
                 <option value="manager">Manager</option>
                 <option value="admin">Admin</option> // Admins should likely be created manually
              </select>
            </div>
            */}
            <Button type="submit" className="w-full" disabled={isSigningUp}>
              {isSigningUp ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Button variant="link" onClick={() => navigate('/login')} className="p-0 h-auto">
              Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
