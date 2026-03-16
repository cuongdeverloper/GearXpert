import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/logoGearXpert.png";

export default function Footer() {
  const navigate = useNavigate();

  const FooterLink = ({ to, children }) => (
    <button
      type="button"
      onClick={() => {
        navigate(to);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="text-sm text-slate-500 hover:text-primary transition-colors font-medium text-left focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
    >
      {children}
    </button>
  );

  const ExternalLink = ({ to, children }) => (
    <Link
      to={to}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-slate-500 hover:text-primary transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
    >
      {children}
    </Link>
  );

  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <div
              className="flex items-center gap-3 cursor-pointer w-fit group"
              onClick={() => navigate("/")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/")}
              aria-label="Go to homepage"
            >
              <img src={logo} alt="GearXpert Logo" className="h-40 w-auto object-contain transition-transform group-hover:scale-110" />
            </div>

            <p className="mt-3 text-sm text-slate-500 leading-relaxed max-w-md">
              Professional rental solutions for tech equipment. Manage rentals,
              track orders, and keep operations transparent for teams.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span className="material-symbols-outlined text-[16px]">
                  verified
                </span>
                Secure
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span className="material-symbols-outlined text-[16px]">
                  bolt
                </span>
                Fast checkout
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span className="material-symbols-outlined text-[16px]">
                  support_agent
                </span>
                Support
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-4 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform</h3>
              <div className="mt-3 flex flex-col gap-2">
                <FooterLink to="/products">Browse Devices</FooterLink>
                <FooterLink to="/pricing">Rental Plans</FooterLink>
                <FooterLink to="/vouchers">Vouchers</FooterLink>
                <FooterLink to="/tracking">Order Tracking</FooterLink>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">Company</h3>
              <div className="mt-3 flex flex-col gap-2">
                <FooterLink to="/about">About</FooterLink>
                <FooterLink to="/blog">Blog</FooterLink>
                <FooterLink to="/contact">Contact</FooterLink>
                <FooterLink to="/faq">FAQ</FooterLink>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-bold text-slate-900">Get in touch</h3>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[18px] text-slate-400">
                  mail
                </span>
                <span>support@gearxpert.io</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[18px] text-slate-400">
                  schedule
                </span>
                <span>Mon–Sat · 08:00–18:00</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <ExternalLink to="https://github.com/">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">
                    code
                  </span>
                </span>
              </ExternalLink>

              <ExternalLink to="https://www.linkedin.com/">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">
                    work
                  </span>
                </span>
              </ExternalLink>

              <ExternalLink to="https://www.facebook.com/">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">
                    public
                  </span>
                </span>
              </ExternalLink>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm font-medium text-center md:text-left">
            © {new Date().getFullYear()} GearXpert Platforms Inc. Professional
            Rental Solutions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <FooterLink to="/privacy">Privacy</FooterLink>
            <FooterLink to="/terms">Terms</FooterLink>
            <FooterLink to="/support">Support</FooterLink>

            <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
