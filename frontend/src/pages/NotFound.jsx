import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-light-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-yankees-blue mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-yankees-blue text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition"
        >
          <Home size={20} />
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
