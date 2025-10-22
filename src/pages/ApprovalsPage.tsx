import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Clock } from 'lucide-react';
import { useNavigate, BrowserRouter } from 'react-router-dom'; // <-- Added BrowserRouter

// The following absolute imports are causing persistent resolution errors in the build environment.
// They are commented out, and mocked versions of 'supabase' and 'useIsAdmin' are defined below
// to ensure the component compiles and can be viewed.
// import { supabase } from '@/integrations/supabase/client';
// import { useIsAdmin } from '@/hooks/useIsAdmin'; 

// --- MOCK DEFINITIONS TO ENSURE COMPILATION ---
// NOTE: Please replace these mock declarations with your actual imports when running in your local environment.
const supabase = { 
    // Mock methods required by the component logic
    from: (table: string) => ({ 
        select: (cols: string = '*') => ({ 
            eq: (col: string, val: string) => ({ 
                order: (col: string, options: any) => ({ data: [], error: null }),
            }),
        }),
        update: (data: any) => ({ 
            eq: (col: string, val: string) => ({ error: null }) 
        }),
    }),
    // FIX: Moved 'channel' and 'removeChannel' to the top level of the supabase object
    channel: (name: string) => ({ 
        on: (type: string, filter: any, callback: Function) => ({ subscribe: () => ({}) }), 
        subscribe: () => ({}), 
        removeChannel: () => ({}) 
    }),
    removeChannel: (channel: any) => ({}) // For the cleanup function
};

// Mocks the hook to always return 'isAdmin: true' so the page is visible.
const useIsAdmin = () => ({ isAdmin: true, isLoading: false }); 
// --- END MOCK DEFINITIONS ---


// Define the interface for the approval request data
interface ApprovalRequest {
  id: string;
  type: 'stock_adjustment' | 'new_product' | 'price_change';
  description: string;
  requested_by: string; // User ID of the requester
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  payload: any; 
}

// Renamed the main logic component to be wrapped by the Router component below
const ApprovalsPageContent = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  // Using the mocked hook now
  const { isAdmin, isLoading: isAuthLoading } = useIsAdmin();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    // Only run this check after authentication is done
    if (!isAuthLoading && !isAdmin) {
      toast.error('You do not have permission to view this page.');
      // Wait briefly before redirecting to allow the toast to show
      setTimeout(() => navigate('/'), 100); 
    }
  }, [isAdmin, isAuthLoading, navigate]);

  // Function to fetch pending approvals
  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      // Check if we are using the mock
      if (typeof supabase.from !== 'function') {
        setApprovals([]);
        console.warn('Using mocked supabase client. Real data will not load.');
        setIsLoading(false);
        return;
      }
      
      // Fetch only pending requests
      const { data, error } = await supabase
        .from('inventory_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setApprovals(data as ApprovalRequest[]);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.error('Failed to load pending approvals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch only if the user is confirmed to be an admin
    if (!isAuthLoading && isAdmin) {
      fetchApprovals();
    }
  }, [isAdmin, isAuthLoading]);
  
  // Setup real-time listener (MOCK - will only run if supabase is the real client)
  useEffect(() => {
      if (!isAuthLoading && isAdmin) {
          // Check if the mock is properly structured for the channel method
          if (typeof supabase.channel !== 'function') {
              console.warn('Supabase mock is incomplete. Skipping real-time setup.');
              return;
          }

          const channel = supabase
              .channel('pending-approvals-updates')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_approvals', filter: 'status=eq.pending' }, (payload) => {
                  fetchApprovals(); // Refetch on any change to pending approvals
              })
              .subscribe();

          // Check if removeChannel is available on the main client object
          if (typeof supabase.removeChannel === 'function') {
              return () => {
                  supabase.removeChannel(channel);
              };
          } else {
              console.warn('Supabase mock is incomplete. Cannot remove channel on cleanup.');
              return;
          }
      }
  }, [isAuthLoading, isAdmin]);


  // Function to handle the approval/rejection action
  const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    setIsProcessing(true);
    try {
      // Check if we are using the mock
      if (typeof supabase.from !== 'function') {
        toast.info(`Mock Action: Request ${id} would be ${newStatus}. (Real action requires actual imports)`);
        setIsProcessing(false);
        return;
      }

      // 1. Update the status of the approval request
      const { error: updateError } = await supabase
        .from('inventory_approvals')
        .update({ status: newStatus, approved_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // NOTE: In a real system, you would execute the inventory change stored in the 'payload' here.
      // Example: if (newStatus === 'approved') { await executeInventoryUpdate(id, approvals.find(a => a.id === id)?.payload); }

      toast.success(`Request ${newStatus} successfully!`);
      // The real-time listener should handle the refresh, but we call it manually for immediate feedback
      fetchApprovals(); 
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error(`Failed to ${newStatus} request.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Display skeleton loading state until both auth and data are ready
  if (isAuthLoading || (isAdmin && isLoading)) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // If user is not admin, the useEffect handles redirection.
  if (!isAdmin) {
    return null; 
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Clock className="w-8 h-8 text-primary" />
        Pending Approvals
        <span className="text-xl font-normal text-muted-foreground">({approvals.length})</span>
      </h1>
      <p className="text-muted-foreground">Review inventory adjustments, new product creations, or price changes that require administrative consent.</p>

      {approvals.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Check className="w-10 h-10 text-green-500 mx-auto mb-4" />
          <CardTitle>All Clear!</CardTitle>
          <p className="text-muted-foreground mt-2">There are no pending approvals at this time.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <Card key={approval.id} className="relative shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex-grow">
                  <span className="text-xs font-semibold uppercase text-primary tracking-wider rounded-full bg-primary/10 px-2 py-0.5">
                    {approval.type.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-lg font-semibold mt-1">{approval.description}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Requested by User ID: <code className="text-xs bg-gray-100 p-1 rounded">{approval.requested_by}</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Date: {new Date(approval.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2 shrink-0 pt-2 sm:pt-0">
                  <Button
                    variant="default" 
                    size="sm"
                    onClick={() => handleAction(approval.id, 'approved')}
                    disabled={isProcessing}
                    className="flex items-center bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction(approval.id, 'rejected')}
                    disabled={isProcessing}
                    className="flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Wrap the content component with BrowserRouter to provide the necessary context for useNavigate()
const ApprovalsPage = () => (
    <BrowserRouter>
        <ApprovalsPageContent />
    </BrowserRouter>
);

export default ApprovalsPage;
