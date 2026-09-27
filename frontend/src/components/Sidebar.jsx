import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Stethoscope,
  HeartPulse,
  Clock3,
  Settings,
  SmilePlus,
  MessageCircle,
} from "lucide-react";

const menuItems = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    name: "Appointments",
    icon: CalendarDays,
    path: "/appointments",
  },
  {
    name: "Patients",
    icon: Users,
    path: "/patients",
  },
  {
    name: "Dentists",
    icon: Stethoscope,
    path: "/dentists",
  },
  {
    name: "Services",
    icon: HeartPulse,
    path: "/services",
  },
  {
    name: "Clinic Schedule",
    icon: Clock3,
    path: "/schedule",
  },
  {
    name: "Conversations",
    icon: MessageCircle,
    path: "/conversations",
  },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* LOGO */}

      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <SmilePlus size={23} />
        </div>

        <div>
          <h1 className="text-lg font-bold text-slate-900">
            DentalCare
          </h1>

          <p className="text-xs text-slate-500">
            Clinic Management
          </p>
        </div>
      </div>

      {/* NAVIGATION */}

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon size={20} />

                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* SETTINGS */}

      <div className="border-t border-slate-100 p-4">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Settings size={20} />

          Settings
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;