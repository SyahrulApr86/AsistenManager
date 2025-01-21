export default function Footer() {
  return (
    <footer className="bg-white shadow-inner mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500">
          © 2024 AsistenManager |{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">Privacy Policy</a> |{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 transition-colors duration-200">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}