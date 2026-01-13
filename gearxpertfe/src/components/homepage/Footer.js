import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-white border-t border-slate-200 mt-12 py-10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="bg-slate-200 rounded-lg p-1 text-slate-600">
            <span className="material-symbols-outlined text-[20px] block">videocam</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-display">GearXpert</h2>
        </div>
        <p className="text-slate-400 text-sm font-medium">© 2024 GearXpert Platforms Inc. Professional Rental Solutions.</p>
        <div className="flex gap-6">
          <a className="text-sm text-slate-500 hover:text-primary transition-colors cursor-pointer" href="#">
            Privacy
          </a>
          <a className="text-sm text-slate-500 hover:text-primary transition-colors cursor-pointer" href="#">
            Terms
          </a>
          <a className="text-sm text-slate-500 hover:text-primary transition-colors cursor-pointer" href="#">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
