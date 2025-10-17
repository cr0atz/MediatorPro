import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, ChevronDown } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: "fas fa-th-large", label: "Dashboard" },
    { href: "/cases", icon: "fas fa-folder-open", label: "All Cases" },
    { href: "/documents", icon: "fas fa-file-alt", label: "Documents" },
    { href: "/ai-assistant", icon: "fas fa-robot", label: "AI Assistant" },
    { href: "/calendar", icon: "fas fa-calendar-alt", label: "Calendar" },
    { href: "/communications", icon: "fas fa-envelope", label: "Communications" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <i className="fas fa-balance-scale text-primary-foreground text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Mediator Pro</h1>
              <p className="text-xs text-muted-foreground">Case Management</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href === "/" && location === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-item flex items-center space-x-3 px-4 py-3 rounded-md transition-colors",
                  isActive
                    ? "active bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className={`${item.icon} w-5`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-accent rounded-md transition-colors" data-testid="button-user-menu">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-secondary-foreground">
                      D
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                    Danny Jovica
                  </p>
                  <p className="text-xs text-muted-foreground">Senior Mediator</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer" data-testid="menu-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.location.href = '/api/logout'}
                className="cursor-pointer text-red-600 focus:text-red-600"
                data-testid="menu-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
