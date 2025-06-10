import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast'; // Corrected import path to hooks

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log(`Attempting ${isLogin ? 'login' : 'signup'} for email: ${email}`); // Added logging

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      console.error('Authentication error:', error.message); // Added logging
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message,
      });
    } else {
      console.log(`${isLogin ? 'Login' : 'Signup'} successful:`, data); // Added logging
      toast({
        title: isLogin ? 'Logged In Successfully' : 'Signed Up Successfully',
        description: isLogin ? 'Welcome back!' : 'Please check your email to confirm your account (if email confirmation is enabled).',
      });
      // Note: Supabase email confirmation is disabled by default as per instructions.
      // The message is included for clarity if it were enabled.
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="p-0 h-auto">
              {isLogin ? 'Sign Up' : 'Login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Auth;
