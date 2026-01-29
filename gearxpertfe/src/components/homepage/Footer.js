import { useNavigate, Link } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  const FooterLink = ({ to, children }) => (
    <button
      type="button"
      onClick={() => {
        navigate(to);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="text-sm text-slate-500 hover:text-primary transition-colors font-medium text-left focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
    >
      {children}
    </button>
  );

  const ExternalLink = ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-slate-500 hover:text-primary transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
    >
      {children}
    </a>
  );

  return (
    <footer className="bg-white border-t border-slate-200 mt-12 py-10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-slate-200 rounded-lg p-1 text-slate-600">
            <span className="material-symbols-outlined text-[20px] block">videocam</span>
          </div>
        </div>

        <p className="text-slate-400 text-sm font-medium">
          © 2024 GearXpert Platforms Inc. Professional Rental Solutions.
        </p>

        <div className="flex gap-6">
          <Link to="/privacy" className="text-sm text-slate-500 hover:text-primary transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="text-sm text-slate-500 hover:text-primary transition-colors">
            Terms
          </Link>
          <Link to="/support" className="text-sm text-slate-500 hover:text-primary transition-colors">
            Support
          </Link>
        </div>

      </div>
    </footer>
  );
}