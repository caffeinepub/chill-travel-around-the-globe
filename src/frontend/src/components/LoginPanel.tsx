import { useState } from 'react';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LoginPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { login, clear, loginStatus, identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';
  const isLoginError = loginStatus === 'loginError';

  const handleAuth = async () => {
    if (isAuthenticated) {
      try {
        await clear();
        queryClient.clear();
        toast.success('Logged out successfully');
        setIsOpen(false);
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Failed to log out');
      }
    } else {
      try {
        await login();
        toast.success('Logged in successfully');
        setIsOpen(false);
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        } else {
          toast.error('Failed to log in. Please try again.');
        }
      }
    }
  };

  const getStatusText = () => {
    if (isInitializing) return 'Initializing...';
    if (isLoggingIn) return 'Logging in...';
    if (isAuthenticated) return 'Authenticated';
    if (isLoginError) return 'Login failed';
    return 'Not authenticated';
  };

  const getStatusColor = () => {
    if (isInitializing || isLoggingIn) return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
    if (isAuthenticated) return 'bg-green-500/10 text-green-700 dark:text-green-300';
    if (isLoginError) return 'bg-red-500/10 text-red-700 dark:text-red-300';
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
  };

  const getPrincipalId = () => {
    if (!identity) return null;
    const principal = identity.getPrincipal().toString();
    // Show first 8 and last 4 characters for readability
    if (principal.length > 12) {
      return `${principal.slice(0, 8)}...${principal.slice(-4)}`;
    }
    return principal;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-lg border border-white/40 dark:border-slate-700/60"
          title="Authentication"
          disabled={isInitializing}
        >
          {isInitializing || isLoggingIn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAuthenticated ? (
            <User className="h-4 w-4" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md z-[3100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication:</span>
                <Badge className={getStatusColor()}>
                  {getStatusText()}
                </Badge>
              </div>
              {isAuthenticated && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Principal ID:</span>
                    <br />
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {getPrincipalId()}
                    </code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authentication Info */}
          <Alert>
            <User className="h-4 w-4" />
            <AlertDescription>
              {isAuthenticated ? (
                <>
                  You are logged in with Internet Identity. You can now upload photos and videos to the City Album section.
                </>
              ) : (
                <>
                  Log in with Internet Identity to upload photos and videos to the City Album. 
                  You can browse and search locations without logging in.
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Authentication Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAuth}
              disabled={isInitializing || isLoggingIn}
              className="w-full"
              variant={isAuthenticated ? "outline" : "default"}
            >
              {isInitializing || isLoggingIn ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isAuthenticated ? (
                <LogOut className="h-4 w-4 mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isInitializing ? 'Initializing...' : 
               isLoggingIn ? 'Logging in...' : 
               isAuthenticated ? 'Log Out' : 'Log In with Internet Identity'}
            </Button>

            {!isAuthenticated && (
              <div className="text-xs text-muted-foreground text-center">
                Internet Identity provides secure, anonymous authentication without passwords or personal information.
              </div>
            )}
          </div>

          {/* Feature Access Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Available features:</div>
            <div className="pl-2 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Search and explore locations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>View interactive maps</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Manage travel journeys</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Rate cities and leave comments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={isAuthenticated ? '' : 'text-muted-foreground'}>
                  Upload photos/videos to City Album {!isAuthenticated && '(requires login)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
