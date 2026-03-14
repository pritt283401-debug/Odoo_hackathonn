import { useAuth } from '../contexts/AuthContext';
import { User, Mail } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your account information</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-2xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gray-900 rounded-full">
              <User className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
              <p className="text-sm text-gray-600">Your account details</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4" />
              <span>Email Address</span>
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
              {user?.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm font-mono">
              {user?.id}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Created
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
