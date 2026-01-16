import { useState } from "react";
import { FiSave, FiBell, FiLock, FiGlobe, FiMail } from "react-icons/fi";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    appName: "GearXpert",
    appEmail: "support@gearxpert.com",
    maintenanceFee: "15",
    platformCommission: "10",
    notifyOnNewUser: true,
    notifyOnRental: true,
    notifyOnReport: true,
    enableTwoFactor: false,
    maintenanceMode: false,
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* System Settings */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FiGlobe className="text-primary" />
          System Settings
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">App Name</label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => handleChange("appName", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
            <input
              type="email"
              value={settings.appEmail}
              onChange={(e) => handleChange("appEmail", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maintenance Fee (%)</label>
              <input
                type="number"
                value={settings.maintenanceFee}
                onChange={(e) => handleChange("maintenanceFee", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Platform Commission (%)</label>
              <input
                type="number"
                value={settings.platformCommission}
                onChange={(e) => handleChange("platformCommission", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              />
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="font-medium text-slate-900">Maintenance Mode</p>
              <p className="text-sm text-slate-500">Temporarily disable the platform</p>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FiBell className="text-primary" />
          Notification Settings
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">New User Registration</p>
              <p className="text-sm text-slate-500">Get notified when new users sign up</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOnNewUser}
              onChange={(e) => handleChange("notifyOnNewUser", e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">New Rental</p>
              <p className="text-sm text-slate-500">Get notified when new rentals are created</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOnRental}
              onChange={(e) => handleChange("notifyOnRental", e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">New Report</p>
              <p className="text-sm text-slate-500">Get notified when users submit reports</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOnReport}
              onChange={(e) => handleChange("notifyOnReport", e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FiLock className="text-primary" />
          Security Settings
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Two-Factor Authentication</p>
              <p className="text-sm text-slate-500">Add an extra layer of security</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enableTwoFactor}
              onChange={(e) => handleChange("enableTwoFactor", e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 cursor-pointer"
            />
          </div>

          <button className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Change Admin Password
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition">
          <FiSave size={18} />
          Save Changes
        </button>
        <button className="flex-1 px-6 py-2.5 rounded-lg border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition">
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
