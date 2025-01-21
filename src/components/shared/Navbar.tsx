import { Home, Calendar, DollarSign, User, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
      <nav className="bg-white shadow-lg fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <BookOpen className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                AsistenManager
              </span>
              </Link>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-indigo-600">
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </a>
                <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200">
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </a>
                <a href="#" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors duration-200">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Finance
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-4">
                <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-600">{user?.username}</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="btn-secondary"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
  );
}