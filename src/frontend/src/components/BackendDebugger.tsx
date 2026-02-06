import { useEffect } from 'react';
import { useActor } from '@/hooks/useActor';
import { useInternetIdentity } from '@/hooks/useInternetIdentity';

/**
 * BackendDebugger Component
 * 
 * This utility component exposes the backend actor to the browser console
 * for debugging and development purposes. It provides:
 * - Global window.backend access to the actor instance
 * - Current principal information
 * - User role verification
 * - Temporary admin promotion functionality (with security warnings)
 * - Admin list query functionality (temporary, for debugging)
 */
export default function BackendDebugger() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  useEffect(() => {
    if (actor) {
      // Expose actor to window for console access
      (window as any).backend = actor;
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🔧 Backend Debugger Active');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('Backend actor is now available as: window.backend');
      console.log('');
      console.log('📋 Available Commands:');
      console.log('');
      console.log('1. Check your role:');
      console.log('   await backend.getCallerUserRole()');
      console.log('');
      console.log('2. Check if you are admin:');
      console.log('   await backend.isCallerAdmin()');
      console.log('');
      console.log('3. ⚠️ TEMPORARY: View all admin principals (bypasses auth):');
      console.log('   await backend.getAdmins()');
      console.log('   Note: This function is TEMPORARY and should be removed after use!');
      console.log('');
      console.log('4. ⚠️⚠️⚠️ EMERGENCY ONLY: Force promote to admin:');
      console.log('   await backend.forcePromoteToAdmin()');
      console.log('   WARNING: This is a CRITICAL SECURITY VULNERABILITY!');
      console.log('   REMOVE forcePromoteToAdmin() from backend code immediately after use!');
      console.log('');
      console.log('📊 Backend Information:');
      console.log(`Backend Canister ID: ${import.meta.env.VITE_BACKEND_CANISTER_ID || 'Not available'}`);
      
      if (identity) {
        const principal = identity.getPrincipal().toString();
        console.log(`Current Principal: ${principal}`);
        
        // Automatically check role
        actor.getCallerUserRole().then((role: any) => {
          console.log(`Current Role: ${role.__kind__ || JSON.stringify(role)}`);
        }).catch((err: any) => {
          console.log('Could not fetch role:', err.message);
        });
      } else {
        console.log('Current Principal: Not authenticated (anonymous)');
      }
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('🔍 ADMIN LIST QUERY INSTRUCTIONS:');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('To view the list of all admin principals, run:');
      console.log('');
      console.log('  await backend.getAdmins()');
      console.log('');
      console.log('This will return an array of Principal IDs for all admins.');
      console.log('');
      console.log('⚠️ SECURITY NOTE:');
      console.log('The getAdmins() function is TEMPORARY and bypasses authorization.');
      console.log('After you have retrieved the admin list, you should:');
      console.log('1. Document the admin principals you need');
      console.log('2. Remove or secure the getAdmins() function in the backend');
      console.log('3. Redeploy the canister');
      console.log('═══════════════════════════════════════════════════════════════');
    }
  }, [actor, identity]);

  return null;
}
